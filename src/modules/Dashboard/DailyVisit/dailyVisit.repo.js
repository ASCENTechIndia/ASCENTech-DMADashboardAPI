const oracledb = require('oracledb');
const { executeQuery } = require('../../../db/queryExecutor');
const { executeProcedure } = require('../../../db/procedureExecutor');

const MONTH_MAP = {
  JAN: 0,
  FEB: 1,
  MAR: 2,
  APR: 3,
  MAY: 4,
  JUN: 5,
  JUL: 6,
  AUG: 7,
  SEP: 8,
  OCT: 9,
  NOV: 10,
  DEC: 11,
};

function createError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function normalizeUserId(userId) {
  const value = String(userId || '').trim();
  if (!value) {
    return value;
  }

  return value.startsWith('E') ? value : `E${value}`;
}

function parseDateText(value) {
  if (!value) {
    return null;
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    return new Date(year, month, day, 0, 0, 0, 0);
  }

  const monMatch = text.match(/^(\d{2})[\/-]([A-Za-z]{3})[\/-](\d{4})$/);
  if (monMatch) {
    const day = Number(monMatch[1]);
    const monthName = monMatch[2].toUpperCase();
    const year = Number(monMatch[3]);
    const month = MONTH_MAP[monthName];

    if (Number.isInteger(month)) {
      return new Date(year, month, day, 0, 0, 0, 0);
    }
  }

  const dmyMatch = text.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]) - 1;
    const year = Number(dmyMatch[3]);
    return new Date(year, month, day, 0, 0, 0, 0);
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
  }

  throw createError('Invalid date format. Use YYYY-MM-DD, DD-MMM-YYYY, or DD/MMM/YYYY.');
}

function formatDateDDMonYYYY(date) {
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
  return `${String(date.getDate()).padStart(2, '0')}-${month}-${date.getFullYear()}`;
}

function parseKeyValueString(text) {
  const map = {};

  const chunks = String(text || '')
    .split('$')
    .map((x) => x.trim())
    .filter(Boolean);

  for (const chunk of chunks) {
    const [rawKey, rawValue] = chunk.split('~');
    if (!rawKey) {
      continue;
    }

    const key = rawKey.trim();
    const value = Number(rawValue ?? 0);
    map[key] = Number.isFinite(value) ? value : 0;
  }

  return map;
}

function normalizeMetricMap(inputMap = {}) {
  const normalized = {};

  for (const [key, value] of Object.entries(inputMap || {})) {
    const canonical = String(key || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_');

    if (!canonical) {
      continue;
    }

    normalized[canonical] = asNumber(value, 0);
  }

  return normalized;
}

function pickCount(map = {}, keys = []) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(map, key)) {
      return asNumber(map[key], 0);
    }
  }

  return 0;
}

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function callProcedure(statement, binds) {
  const result = await executeProcedure({
    statement,
    binds,
    useTx: false,
  });

  return result.outBinds || {};
}

async function safeCall(name, action) {
  try {
    return { value: await action(), error: null };
  } catch (error) {
    return { value: null, error: `${name}: ${error.message}` };
  }
}

async function resolveUserContext({ userId }) {
  const resolvedUserId = normalizeUserId(userId);

  if (!resolvedUserId) {
    throw createError('userId is required.');
  }

  const profileResult = await executeQuery(
    `SELECT
        u.num_usermst_brid AS COMPID,
        u.var_usermst_userfullname AS USERNAME,
        u.date_usermst_lastlogin AS LASTLOGIN,
        u.date_usermst_lastlogout AS LASTLOGOUT,
        u.date_usermst_lastchangepwd AS LASTCHANGEPWD,
        u.num_usermst_usertype AS USERTYPE,
        u.num_usermst_desgid AS DESGID,
        b.brid AS BRID,
        b.branchname AS BRANCHNAME,
        b.companyname AS COMPNAME,
        b.brcategory AS BRCATEGORY,
        r.var_userrole_name AS USERROLE,
        ud.var_userdevice_name AS TYPENAME
      FROM etech.aoup_usermst_def u
      INNER JOIN etech.branchlist b ON b.brid = u.num_usermst_brid
      LEFT OUTER JOIN etech.aoup_userrole_mas r ON r.num_userrole_id = u.num_usermst_roleid
      LEFT OUTER JOIN etech.aoup_userdevice_mas ud ON ud.num_userdevice_id = u.num_usermst_usertype
      WHERE u.var_usermst_userid = :userId
        AND u.num_usermst_usertype = 3`,
    { userId: resolvedUserId }
  );

  const row = profileResult.rows?.[0];
  if (!row) {
    throw createError('User not found or not authorized for Daily Visit dashboard.', 404);
  }

  return {
    userId: resolvedUserId,
    brid: String(row.BRID || ''),
    branchName: String(row.BRANCHNAME || ''),
    brCategory: String(row.BRCATEGORY || ''),
    userName: String(row.USERNAME || ''),
    companyName: String(row.COMPNAME || ''),
    userRole: String(row.USERROLE || ''),
    typeName: String(row.TYPENAME || ''),
  };
}

function resolveDateRange(fromDateInput, toDateInput) {
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const defaultTo = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  // const fromDate = parseDateText(fromDateInput) || defaultFrom;
  // const toDate = parseDateText(toDateInput) || defaultTo;

    const fromDate = new Date('2026-04-01') || defaultFrom;
  const toDate = new Date('2026-04-30') || defaultTo;

  if (fromDate.getTime() > toDate.getTime()) {
    throw createError('From date can not be greater than to date.');
  }

  const daySpan = Math.floor((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000));
  if (daySpan > 30) {
    throw createError('Only 30 days transactions will be show.');
  }

  if (fromDate.getFullYear() !== toDate.getFullYear() || fromDate.getMonth() !== toDate.getMonth()) {
    throw createError('Selected dates should be of the same Month.');
  }

  const firstDayOfMonth = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1, 0, 0, 0, 0);
  const isLegacyCurrentMonthDefaultRange =
    fromDate.getTime() === defaultFrom.getTime() &&
    toDate.getTime() === defaultTo.getTime();

  // Legacy WebForms passes DateTime.Now for current-month default range,
  // and selected end-date otherwise.
  const procedureCurrentDate = isLegacyCurrentMonthDefaultRange ? now : toDate;
  // const numberOfDays = daySpan + 1;
  const numberOfDays = 30;
  

  
  return {
    fromDate,
    toDate,
    firstDayOfMonth,
    procedureCurrentDate,
    numberOfDays,
  };
}

async function getDailyVisitDashboardData(payload) {
  const userContext = await resolveUserContext(payload);
  const range = resolveDateRange(payload.fromDate, payload.toDate);
  const warnings = [];

  const [
    allocationStatus,
    visitedCount,
    visitStats,
    sunburstData,
    totalCollectable,
    totalCollected,
    collectionPercent,
    ptpTotal,
    ptpPaid,
    ptpBroken,
    fullPaidViaVisit,
    totalFullPaidAccounts,
    totalFullPaidAmount,
  ] = await Promise.all([
    safeCall('AOUP_ALLOCATION_STATUS', async () => {
      const out = await callProcedure(
        `BEGIN atbss.AOUP_ALLOCATION_STATUS(
          :in_category,
          :in_brid,
          :in_first_day,
          :in_current_date,
          :in_username,
          :out_Result,
          :out_ErrorCode,
          :out_ErrorMsg
        ); END;`,
        {
          in_category: userContext.brCategory,
          in_brid: userContext.brid,
          in_first_day: range.firstDayOfMonth,
          in_current_date: range.procedureCurrentDate,
          in_username: userContext.userId,
          out_Result: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 2000 },
          out_ErrorCode: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 100 },
          out_ErrorMsg: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 2000 },
        }
      );

      return {
        rawResult: String(out.out_Result || ''),
        parsed: normalizeMetricMap(parseKeyValueString(out.out_Result || '')),
      };
    }),
    safeCall('AOUP_VISIT_COUNT', async () => {
      const out = await callProcedure(
        `BEGIN atbss.AOUP_VISIT_COUNT(
          :in_userid,
          :in_first_day,
          :in_current_date,
          :in_category,
          :in_branch,
          :out_ErrorCode,
          :out_ErrorMsg
        ); END;`,
        {
          in_userid: userContext.userId,
          in_first_day: range.firstDayOfMonth,
          in_current_date: range.procedureCurrentDate,
          in_category: userContext.brCategory,
          in_branch: userContext.branchName,
          out_ErrorCode: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 100 },
          out_ErrorMsg: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 2000 },
        }
      );

      return asNumber(out.out_ErrorMsg, 0);
    }),
    safeCall('AOUP_VISIT_STATISTICS', async () => {
      const out = await callProcedure(
        `BEGIN atbss.AOUP_VISIT_STATISTICS(
          :in_userid,
          :in_first_day,
          :in_current_date,
          :out_Result,
          :out_ErrorCode,
          :out_ErrorMsg
        ); END;`,
        {
          in_userid: userContext.userId,
          in_first_day: range.firstDayOfMonth,
          in_current_date: range.procedureCurrentDate,
          out_Result: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 2000 },
          out_ErrorCode: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 100 },
          out_ErrorMsg: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 2000 },
        }
      );

      return parseKeyValueString(out.out_Result || '');
    }),
    safeCall('aoup_Sunburst_data', async () => {
      const out = await callProcedure(
        `BEGIN atbss.aoup_Sunburst_data(
          :in_userid,
          :in_first_day,
          :in_current_date,
          :out_Result,
          :out_ErrorCode,
          :out_ErrorMsg
        ); END;`,
        {
          in_userid: userContext.userId,
          in_first_day: range.firstDayOfMonth,
          in_current_date: range.procedureCurrentDate,
          out_Result: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 4000 },
          out_ErrorCode: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 100 },
          out_ErrorMsg: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 2000 },
        }
      );

      return parseKeyValueString(out.out_Result || '');
    }),
    safeCall('Calculate_CollectableAmount', async () => {
      const out = await callProcedure(
        `BEGIN Calculate_CollectableAmount(
          :p_start_date,
          :p_end_date,
          :p_user_id,
          :o_collectable_amount
        ); END;`,
        {
          p_start_date: range.firstDayOfMonth,
          p_end_date: range.procedureCurrentDate,
          p_user_id: userContext.userId,
          o_collectable_amount: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        }
      );

      return asNumber(out.o_collectable_amount, 0);
    }),
    safeCall('AOUP_TOTAL_COLLECTED', async () => {
      const out = await callProcedure(
        `BEGIN atbss.AOUP_TOTAL_COLLECTED(
          :in_start_date,
          :in_end_date,
          :in_userid,
          :out_collected,
          :out_error_code,
          :out_error_msg
        ); END;`,
        {
          in_start_date: range.fromDate,
          in_end_date: range.toDate,
          in_userid: userContext.userId,
          out_collected: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          out_error_code: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 100 },
          out_error_msg: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 2000 },
        }
      );

      return asNumber(out.out_collected, 0);
    }),
    safeCall('Aoup_get_monthly__summary_Resolution_per', async () => {
      const out = await callProcedure(
        `BEGIN ATBSS.Aoup_get_monthly__summary_Resolution_per(
          :out_loan_amt,
          :out_res_amt,
          :out_res_pct
        ); END;`,
        {
          out_loan_amt: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          out_res_amt: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          out_res_pct: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        }
      );

      return {
        resolutionAmount: asNumber(out.out_res_amt, 0),
        resolutionPercent: asNumber(out.out_res_pct, 0),
      };
    }),
    safeCall('AOUP_TOTAL_PTP_COUNT', async () => {
      const out = await callProcedure(
        `BEGIN atbss.AOUP_TOTAL_PTP_COUNT(
          :in_userid,
          :in_first_day,
          :in_current_date,
          :out_total_count,
          :out_ErrorCode,
          :out_ErrorMsg
        ); END;`,
        {
          in_userid: userContext.userId,
          in_first_day: range.firstDayOfMonth,
          in_current_date: range.procedureCurrentDate,
          out_total_count: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          out_ErrorCode: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          out_ErrorMsg: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 2000 },
        }
      );

      return asNumber(out.out_total_count, 0);
    }),
    safeCall('AOUP_PAID_PTP_COUNT', async () => {
      const out = await callProcedure(
        `BEGIN atbss.AOUP_PAID_PTP_COUNT(
          :in_first_day,
          :in_current_date,
          :in_userid,
          :out_ErrorCode,
          :out_ErrorMsg,
          :out_PaidPTP
        ); END;`,
        {
          in_first_day: range.firstDayOfMonth,
          in_current_date: range.procedureCurrentDate,
          in_userid: userContext.userId,
          out_ErrorCode: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 100 },
          out_ErrorMsg: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 2000 },
          out_PaidPTP: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        }
      );

      return asNumber(out.out_PaidPTP, 0);
    }),
    safeCall('AOUP_BROKEN_PTP_COUNT', async () => {
      const out = await callProcedure(
        `BEGIN atbss.AOUP_BROKEN_PTP_COUNT(
          :in_start_date,
          :in_end_date,
          :in_userid,
          :out_ErrorCode,
          :out_ErrorMsg,
          :out_brokenPTP
        ); END;`,
        {
          in_start_date: range.fromDate,
          in_end_date: range.procedureCurrentDate,
          in_userid: userContext.userId,
          out_ErrorCode: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          out_ErrorMsg: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 2000 },
          out_brokenPTP: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        }
      );

      return asNumber(out.out_brokenPTP, 0);
    }),
    safeCall('AOUP_ACCOUNTS_WITH_CF_AND_CPP', async () => {
      const out = await callProcedure(
        `BEGIN atbss.AOUP_ACCOUNTS_WITH_CF_AND_CPP(
          :in_start_date,
          :in_end_date,
          :in_userid,
          :out_ErrorCode,
          :out_ErrorMsg,
          :out_AccountCount
        ); END;`,
        {
          in_start_date: range.fromDate,
          in_end_date: range.procedureCurrentDate,
          in_userid: userContext.userId,
          out_ErrorCode: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          out_ErrorMsg: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 2000 },
          out_AccountCount: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        }
      );

      return asNumber(out.out_AccountCount, 0);
    }),
    safeCall('AOUP_ACCOUNTS_FULL_AMOUNT_COLLECTED', async () => {
      const out = await callProcedure(
        `BEGIN atbss.AOUP_ACCOUNTS_FULL_AMOUNT_COLLECTED(
          :in_start_date,
          :in_end_date,
          :in_userid,
          :out_ErrorCode,
          :out_ErrorMsg,
          :out_AccountCount
        ); END;`,
        {
          in_start_date: range.fromDate,
          in_end_date: range.procedureCurrentDate,
          in_userid: userContext.userId,
          out_ErrorCode: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          out_ErrorMsg: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 2000 },
          out_AccountCount: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        }
      );

      return asNumber(out.out_AccountCount, 0);
    }),
    safeCall('AOUP_COLLECTED_FULL_ACCOUNT_AMOUNT', async () => {
      const out = await callProcedure(
        `BEGIN atbss.AOUP_COLLECTED_FULL_ACCOUNT_AMOUNT(
          :in_start_date,
          :in_end_date,
          :in_userid,
          :out_ErrorCode,
          :out_ErrorMsg,
          :out_CollectedAmt
        ); END;`,
        {
          in_start_date: range.fromDate,
          in_end_date: range.toDate,
          in_userid: userContext.userId,
          out_ErrorCode: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          out_ErrorMsg: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 2000 },
          out_CollectedAmt: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        }
      );

      return asNumber(out.out_CollectedAmt, 0);
    }),
  ]);

  [
    allocationStatus,
    visitedCount,
    visitStats,
    sunburstData,
    totalCollectable,
    totalCollected,
    collectionPercent,
    ptpTotal,
    ptpPaid,
    ptpBroken,
    fullPaidViaVisit,
    totalFullPaidAccounts,
    totalFullPaidAmount,
  ].forEach((item) => {
    if (item.error) {
      warnings.push(item.error);
    }
  });

  const allocationPayload = allocationStatus.value || { rawResult: '', parsed: {} };
  const allocationMap = allocationPayload.parsed || {};
  const totalAccounts = pickCount(allocationMap, ['TOTAL', 'N_TOTAL_COUNT']);
  const unallocatedAccounts = pickCount(allocationMap, ['UNALLOCATED', 'N_UNALLOCATED_COUNT']);
  const allocatedAccounts = pickCount(allocationMap, ['ALLOCATED', 'N_ALLOCATED_COUNT']);
  const visitedAccounts = asNumber(visitedCount.value, 0);
  const nonVisitedAccounts = Math.max(0, allocatedAccounts - visitedAccounts);

  const fosAssignedPercent = totalAccounts > 0
    ? Number(((allocatedAccounts / totalAccounts) * 100).toFixed(2))
    : 0;

  const totalAssignedFOS = allocatedAccounts;
  const totalUnassignedFOS_alt = totalAccounts - allocatedAccounts;

  const visitStatsMap = visitStats.value || {};
  const totalVisits = asNumber(visitStatsMap.Total_visits ?? visitStatsMap.TOTAL_VISITS ?? visitStatsMap.TotalVisits, 0);
  const uniqueVisits = asNumber(visitStatsMap.Unique_visits ?? visitStatsMap.UNIQUE_VISITS ?? visitStatsMap.UniqueVisits, 0);
  const intensity = asNumber(visitStatsMap.Intensity, uniqueVisits > 0 ? totalVisits / uniqueVisits : 0);
  const avgDailyVisitRate = asNumber(
    visitStatsMap['Avg.Daily Visit Rate'] ?? visitStatsMap.AVG_DAILY_VISIT_RATE,
    range.numberOfDays > 0 ? totalVisits / range.numberOfDays : 0
  );

  const totalCollectableAmount = asNumber(totalCollectable.value, 0);
  const totalCollectedAmount = asNumber(totalCollected.value, 0);
  const dailyAvgCollectionAmount = range.numberOfDays > 0
    ? Number((totalCollectedAmount / range.numberOfDays).toFixed(2))
    : 0;

  const collectionInfo = collectionPercent.value || {};
  const collectionPercentValue = asNumber(
    collectionInfo.resolutionPercent,
    totalCollectableAmount > 0 ? (totalCollectedAmount / totalCollectableAmount) * 100 : 0
  );

  const totalPtpCount = asNumber(ptpTotal.value, 0);
  const paidPtpCount = asNumber(ptpPaid.value, 0);
  const brokenPtpCount = asNumber(ptpBroken.value, 0);
  const pendingPtpCount = Math.max(0, totalPtpCount - (paidPtpCount + brokenPtpCount));
  const ptpConversionPercent = totalPtpCount > 0
    ? Number(((paidPtpCount / totalPtpCount) * 100).toFixed(2))
    : 0;

  const sunburst = sunburstData.value || {};

  return {
    userContext,
    dateRange: {
      fromDate: formatDateDDMonYYYY(range.fromDate),
      toDate: formatDateDDMonYYYY(range.toDate),
      firstDayOfMonth: formatDateDDMonYYYY(range.firstDayOfMonth),
      procedureCurrentDate: range.procedureCurrentDate,
      numberOfDays: range.numberOfDays,
      ptpDateRangeLabel: `PTP spans from ${formatDateDDMonYYYY(range.firstDayOfMonth)} to ${formatDateDDMonYYYY(range.toDate)}`,
    },
    allocation: {
      totalAccounts,
      allocatedAccounts,
      unallocatedAccounts,
      visitedAccounts,
      nonVisitedAccounts,
      fosAssignedPercent,
      totalAssignedFOS,
      totalUnassignedFOS_alt,
      dotNetBindings: {
        label15TotalAccounts: totalAccounts,
        label9VisitDetailsTotal: allocatedAccounts,
      },
      debug: {
        allocationRawResult: allocationPayload.rawResult,
        allocationParsed: allocationMap,
      },
    },
    visitStats: {
      totalVisits,
      uniqueVisits,
      intensity: Number(asNumber(intensity, 0).toFixed(2)),
      avgDailyVisitRate: Number(asNumber(avgDailyVisitRate, 0).toFixed(2)),
    },
    collection: {
      totalCollectableAmount: Number(totalCollectableAmount.toFixed(2)),
      totalCollectedAmount: Number(totalCollectedAmount.toFixed(2)),
      dailyAvgCollectionAmount,
      collectionPercent: Number(collectionPercentValue.toFixed(2)),
      monthlyResolutionAmount: Number(asNumber(collectionInfo.resolutionAmount, 0).toFixed(2)),
    },
    ptp: {
      totalPtpCount,
      pendingPtpCount,
      paidPtpCount,
      brokenPtpCount,
      ptpConversionPercent,
    },
    fullPayment: {
      accountsPaidViaVisit: asNumber(fullPaidViaVisit.value, 0),
      totalFullPaidAccounts: asNumber(totalFullPaidAccounts.value, 0),
      totalFullPaidAmount: Number(asNumber(totalFullPaidAmount.value, 0).toFixed(2)),
    },
    dispositionSunburst: {
      total: asNumber(sunburst.Total, 0),
      reacted: asNumber(sunburst.Reacted, 0),
      collected: asNumber(sunburst.Collected, 0),
      cp: asNumber(sunburst.CP, 0),
      cf: asNumber(sunburst.CF, 0),
      ptp: asNumber(sunburst.PTP, 0),
      borrowerAbusive: asNumber(sunburst.Borrower_Abusive, 0),
      nonReacted: asNumber(sunburst.Non_Reacted, 0),
      invalid: asNumber(sunburst.Invalid ?? sunburst.Non_Reacted, 0),
      shortAddress: asNumber(sunburst.Short_Address, 0),
      addressNotFound: asNumber(sunburst.Address_Not_Found, 0),
    },
    warnings,
  };
}

module.exports = {
  getDailyVisitDashboardData,
};
