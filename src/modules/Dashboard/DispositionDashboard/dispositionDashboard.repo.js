const { executeQuery } = require('../../../db/queryExecutor');

function normalizeUserId(userId) {
  const value = String(userId || '').trim();
  if (!value) {
    return value;
  }
  return value.startsWith('E') ? value : `E${value}`;
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function resolveMonthYear(query = {}) {
  if (query.monthYear) {
                const value = String(query.monthYear).trim();
                const match = value.match(/^(0[1-9]|1[0-2])\s*-\s*(\d{4})$/);
    if (match) {
      return {
        month: Number(match[1]),
        year: Number(match[2]),
        monthYear: `${match[1]}-${match[2]}`,
      };
    }
  }

  const month = Number(query.month) || new Date().getMonth() + 1;
  const year = Number(query.year) || new Date().getFullYear();
  return {
    month,
    year,
    monthYear: `${pad2(month)}-${year}`,
  };
}

function getDaysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

function buildChartSeries(rows, totalDays, dayResolver, countResolver) {
  const counts = new Map();
        for (const row of rows || []) {
                const dayValue = String(dayResolver(row) || '').padStart(2, '0');
    if (!dayValue) {
      continue;
    }
                counts.set(dayValue, Number(countResolver(row) ?? 0));
  }

  const labels = [];
  const data = [];
  for (let day = 1; day <= totalDays; day += 1) {
    const label = pad2(day);
    labels.push(label);
    data.push(counts.get(label) || 0);
  }

  return { labels, data };
}

function dedupeRowsByTransId(rows) {
  const seen = new Set();
  const output = [];

  for (const row of rows || []) {
    const transId = String(row.TRANSID ?? row.transid ?? row.TRANS_ID ?? '').trim();
    const key = transId || JSON.stringify(row);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(row);
  }

  return output;
}

function maskValue(value) {
        if (!value) {
                return value;
        }
        const str = String(value);
        if (str.length <= 4) {
                return str;
        }
        return '*'.repeat(str.length - 4) + str.slice(-4);
}

function resolveLegacyChart1Day(dateText) {
        const raw = String(dateText || '').trim();
        const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!match) {
                return raw ? raw.split('/')[0] : '';
        }

        const dd = Number(match[1]);
        const mm = Number(match[2]);

        // Legacy WebForms used DateTime.Parse on dd/mm/yyyy text, which can behave
        // like MM/DD parsing for ambiguous dates (day <= 12). Mirror that output.
        if (dd >= 1 && dd <= 12) {
                return pad2(mm);
        }

        return pad2(dd);
}

async function getDashboardData({ userId, brCategory, query }) {
  const normalizedUserId = normalizeUserId(userId);
  const scope = resolveMonthYear(query);
  const monthText = pad2(scope.month);
  const selectedMonthYear = scope.monthYear;
        const selectedMonthYearWithSpaces = `${monthText} - ${scope.year}`;
  const totalDays = getDaysInMonth(scope.month, scope.year);
  const isBranchCategory = String(brCategory) === '5';

  const chart1Sql = isBranchCategory
    ? `
      SELECT TO_CHAR(dat_banktransdet_transdat, 'dd/mm/yyyy') AS TRANS_DATE,
             COUNT(DISTINCT VAR_BANKTRANSDET_USERID) AS NUM_TRANSACTIONS
        FROM atbss.aoup_etech_banktransdetails bt
        LEFT OUTER JOIN atbss.aoup_etech_bankingtransmast
                ON num_banktransmast_transid = num_banktransdet_transid
        LEFT OUTER JOIN atbss.aoup_etech_bankdata bd
                ON bd.var_bankdata_contractnum = var_banktransmast_contrctno
        INNER JOIN etech.aoup_usermst_def c
                ON var_banktransdet_userid = var_usermst_userid
        INNER JOIN etech.view_user_level_new
                ON Main_compid = num_usermst_brid
                OR center_compid = num_usermst_brid
                OR Zone_compid = num_usermst_brid
                OR State_compid = num_usermst_brid
                OR branch_compid = num_usermst_brid
        INNER JOIN etech.aoup_usermst_def t
                ON Main_compid = t.num_usermst_brid
                OR center_compid = t.num_usermst_brid
                OR Zone_compid = t.num_usermst_brid
                OR State_compid = t.num_usermst_brid
                OR branch_compid = t.num_usermst_brid
        INNER JOIN etech.aoup_companymst_def
                ON num_companymst_compid = t.num_usermst_brid
        LEFT OUTER JOIN atbss.aoup_etech_bankingtransmast mst
                ON mst.num_banktransmast_transid = num_banktransdet_transid
        LEFT OUTER JOIN atbss.aoup_etech_visitstatus_mst
                ON num_visitstatus_id = var_banktransdet_visitststs
        LEFT OUTER JOIN atbss.aoup_etech_feedbacktype_mst
                ON var_feedbacktype_mst_id = var_banktransdet_custfeedbck
        LEFT OUTER JOIN aoup_companycode_mas
                ON num_companycode_id = c.num_usermst_compcode
        LEFT OUTER JOIN atbss.aoup_etech_rfdmaster
                ON num_rfdmst_id = num_banktransdet_rfdid
        LEFT OUTER JOIN atbss.aoup_etech_rcstatusmst
                ON num_rcstatus_id = num_banktransdet_rcid
       WHERE TO_CHAR(dat_banktransdet_transdat, 'MM - YYYY') = :monthYearWithSpaces
         AND TRIM(var_bankdata_branch) = TRIM(var_companymst_branchname)
         AND t.var_usermst_userid = :userId
       GROUP BY TO_CHAR(dat_banktransdet_transdat, 'dd/mm/yyyy')
       ORDER BY TO_DATE(TO_CHAR(dat_banktransdet_transdat, 'dd/mm/yyyy'), 'dd/mm/yyyy')
    `
    : `
      SELECT TO_CHAR(dat_banktransdet_transdat, 'dd/mm/yyyy') AS TRANS_DATE,
             COUNT(DISTINCT VAR_BANKTRANSDET_USERID) AS NUM_TRANSACTIONS
        FROM atbss.aoup_etech_banktransdetails bt
        INNER JOIN etech.aoup_usermst_def c
                ON var_banktransdet_userid = var_usermst_userid
        INNER JOIN etech.view_user_level_new
                ON Main_compid = num_usermst_brid
                OR center_compid = num_usermst_brid
                OR Zone_compid = num_usermst_brid
                OR State_compid = num_usermst_brid
                OR branch_compid = num_usermst_brid
        INNER JOIN etech.aoup_usermst_def t
                ON Main_compid = t.num_usermst_brid
                OR center_compid = t.num_usermst_brid
                OR Zone_compid = t.num_usermst_brid
                OR State_compid = t.num_usermst_brid
                OR branch_compid = t.num_usermst_brid
        LEFT OUTER JOIN atbss.aoup_etech_bankingtransmast
                ON num_banktransmast_transid = num_banktransdet_transid
        LEFT OUTER JOIN atbss.aoup_etech_visitstatus_mst
                ON num_visitstatus_id = var_banktransdet_visitststs
        LEFT OUTER JOIN atbss.aoup_etech_feedbacktype_mst
                ON var_feedbacktype_mst_id = var_banktransdet_custfeedbck
        LEFT OUTER JOIN aoup_companycode_mas
                ON num_companycode_id = c.num_usermst_compcode
        LEFT OUTER JOIN atbss.aoup_etech_rfdmaster
                ON num_rfdmst_id = num_banktransdet_rfdid
        LEFT OUTER JOIN atbss.aoup_etech_rcstatusmst
                ON num_rcstatus_id = num_banktransdet_rcid
       WHERE TO_CHAR(dat_banktransdet_transdat, 'MM-YYYY') = :monthYear
         AND t.var_usermst_userid = :userId
       GROUP BY TO_CHAR(dat_banktransdet_transdat, 'dd/mm/yyyy')
       ORDER BY TO_DATE(TO_CHAR(dat_banktransdet_transdat, 'dd/mm/yyyy'), 'dd/mm/yyyy')
    `;

  const chart2Sql = isBranchCategory
    ? `
      SELECT TO_CHAR(TO_DATE(DAT_BANKTRANSDET_TRANSDAT, 'DD-MM-YY'), 'DD') AS day,
             COUNT(*) AS transaction_count
        FROM atbss.aoup_etech_banktransdetails
        LEFT OUTER JOIN atbss.aoup_etech_bankingtransmast
                ON num_banktransmast_transid = num_banktransdet_transid
        LEFT OUTER JOIN atbss.aoup_etech_bankdata bd
                ON bd.var_bankdata_contractnum = var_banktransmast_contrctno
        INNER JOIN etech.aoup_usermst_def
                ON var_usermst_userid = var_banktransdet_userid
        INNER JOIN etech.view_user_level_new
                ON Main_compid = num_usermst_brid
                OR center_compid = num_usermst_brid
                OR Zone_compid = num_usermst_brid
                OR State_compid = num_usermst_brid
                OR branch_compid = num_usermst_brid
        INNER JOIN etech.aoup_usermst_def t
                ON Main_compid = t.num_usermst_brid
                OR center_compid = t.num_usermst_brid
                OR Zone_compid = t.num_usermst_brid
                OR State_compid = t.num_usermst_brid
                OR branch_compid = t.num_usermst_brid
        INNER JOIN etech.aoup_companymst_def
                ON num_companymst_compid = t.num_usermst_brid
       WHERE TO_CHAR(TO_DATE(DAT_BANKTRANSDET_TRANSDAT, 'DD-MM-YY'), 'MM') = :month
         AND TO_CHAR(TO_DATE(DAT_BANKTRANSDET_TRANSDAT, 'DD-MM-YY'), 'YYYY') = :year
         AND t.var_usermst_userid = :userId
         AND TRIM(var_bankdata_branch) = TRIM(var_companymst_branchname)
       GROUP BY TO_CHAR(TO_DATE(DAT_BANKTRANSDET_TRANSDAT, 'DD-MM-YY'), 'DD')
       ORDER BY day
    `
    : `
      SELECT TO_CHAR(TO_DATE(DAT_BANKTRANSDET_TRANSDAT, 'DD-MM-YY'), 'DD') AS day,
             COUNT(*) AS transaction_count
        FROM atbss.aoup_etech_banktransdetails
        INNER JOIN etech.aoup_usermst_def
                ON var_usermst_userid = var_banktransdet_userid
        INNER JOIN etech.view_user_level_new
                ON Main_compid = num_usermst_brid
                OR center_compid = num_usermst_brid
                OR Zone_compid = num_usermst_brid
                OR State_compid = num_usermst_brid
                OR branch_compid = num_usermst_brid
        INNER JOIN etech.aoup_usermst_def t
                ON Main_compid = t.num_usermst_brid
                OR center_compid = t.num_usermst_brid
                OR Zone_compid = t.num_usermst_brid
                OR State_compid = t.num_usermst_brid
                OR branch_compid = t.num_usermst_brid
       WHERE TO_CHAR(TO_DATE(DAT_BANKTRANSDET_TRANSDAT, 'DD-MM-YY'), 'MM') = :month
         AND TO_CHAR(TO_DATE(DAT_BANKTRANSDET_TRANSDAT, 'DD-MM-YY'), 'YYYY') = :year
         AND t.var_usermst_userid = :userId
       GROUP BY TO_CHAR(TO_DATE(DAT_BANKTRANSDET_TRANSDAT, 'DD-MM-YY'), 'DD')
       ORDER BY day
    `;

  const gridSql = isBranchCategory
    ? `
      SELECT num_banktransdet_transid AS srno,
             '''' || var_banktransdet_transidnew AS transid,
             c.num_usermst_email AS MDM_ID,
             REPLACE(var_banktransdet_userid, 'E', '') AS userid,
              c.var_usermst_userfullname AS username,
             '''' || var_banktransmast_contrctno AS contractnum,
             var_visitstatus_type AS visitststs,
             var_feedbacktype_mst_desc AS feedback,
             VAR_BANKDATA_BRANCH,
             VAR_BANKDATA_PRODUCTCODE,
             VAR_BANKDATA_PRODUCTNM,
             VAR_BANKDATA_REGISTRNO,
             CASE var_banktransdet_paymode
               WHEN 'C' THEN 'online'
               WHEN 'Q' THEN 'Cheque'
               WHEN 'R' THEN 'Online'
               ELSE var_banktransdet_paymode
             END AS paymode,
             num_banktransdet_paidamt AS paidamt,
             num_banktransdet_chqno AS instrumentno,
             dat_banktransdet_chqdt AS instrumentdt,
             var_banktransdet_bankname AS bankname,
             var_banktransdet_billdeskrefno AS billdeskrefno,
             var_banktransdet_authcode AS authcode,
             var_banktransdet_billdeskmsg AS billdeskmsg,
             var_banktransdet_altrphno1 AS mobileno,
             var_banktransdet_altrphno2 AS altrphno2,
             var_banktransdet_email1 AS email1,
             var_banktransdet_altrnatadd AS address,
             dat_banktransmast_ptpdt AS ptpdate,
             dat_banktransdet_reshudt AS reshudt,
             var_banktransdet_visitremark AS visitremark,
             var_banktransdet_panform AS panform,
             var_banktransdet_pandetails AS pandetails,
             var_banktransdet_settleflag AS settleflag,
             TO_CHAR(dat_banktransdet_transdat, 'dd/mm/yyyy') AS trans_date,
             TO_CHAR(dat_banktransdet_transdat, 'hh24:mi:ss') AS trans_time,
             dat_banktransdet_oflntransdate AS oflntransdate,
             var_banktransdet_golocation AS golocation,
             var_tmfl_uploadflag AS uploadflag,
             var_tmfl_response AS response,
             var_creditlimit_flag AS authorisationflag,
             bd.var_bankdata_cobrowsraddress AS customerAddress,
             var_bankdata_branch AS lenderLocationName,
             var_bankdata_registrno AS Product_Type,
             var_bankdata_customernm AS customername,
             c.var_usermst_empcode AS employecode,
             SUBSTR(var_banktransdet_golocation, 1, INSTR(var_banktransdet_golocation, ',') - 1) AS lattitude,
             SUBSTR(var_banktransdet_golocation, INSTR(var_banktransdet_golocation, ',') + 1) AS longtitude
        FROM atbss.aoup_etech_banktransdetails
        LEFT OUTER JOIN atbss.aoup_etech_bankingtransmast
                ON num_banktransmast_transid = num_banktransdet_transid
        LEFT OUTER JOIN atbss.aoup_etech_bankdata bd
                ON bd.var_bankdata_contractnum = var_banktransmast_contrctno
        LEFT OUTER JOIN atbss.aoup_etech_visitstatus_mst
                ON num_visitstatus_id = var_banktransdet_visitststs
        LEFT OUTER JOIN atbss.aoup_etech_feedbacktype_mst
                ON var_feedbacktype_mst_id = var_banktransdet_custfeedbck
        INNER JOIN etech.aoup_usermst_def c
                ON c.var_usermst_userid = var_banktransdet_userid
        INNER JOIN etech.view_user_level_new
                ON Main_compid = num_usermst_brid
                OR center_compid = num_usermst_brid
                OR Zone_compid = num_usermst_brid
                OR State_compid = num_usermst_brid
                OR branch_compid = num_usermst_brid
        INNER JOIN etech.aoup_usermst_def t
                ON Main_compid = t.num_usermst_brid
                OR center_compid = t.num_usermst_brid
                OR Zone_compid = t.num_usermst_brid
                OR State_compid = t.num_usermst_brid
                OR branch_compid = t.num_usermst_brid
        INNER JOIN etech.aoup_companymst_def
                ON num_companymst_compid = t.num_usermst_brid
                 WHERE (TO_CHAR(dat_banktransdet_transdat, 'MM-YYYY') = :monthYear
                         OR TO_CHAR(dat_banktransdet_transdat, 'MM - YYYY') = :monthYearWithSpaces)
         AND TRIM(var_bankdata_branch) = TRIM(var_companymst_branchname)
         AND t.var_usermst_userid = :userId
       ORDER BY dat_banktransdet_transdat
    `
    : `
      SELECT num_banktransdet_transid AS srno,
             '''' || var_banktransdet_transidnew AS transid,
             c.num_usermst_email AS MDM_ID,
             REPLACE(var_banktransdet_userid, 'E', '') AS userid,
             c.var_usermst_userfullname AS username,
             '''' || var_banktransmast_contrctno AS contractnum,
             var_visitstatus_type AS visitststs,
             var_feedbacktype_mst_desc AS feedback,
             VAR_BANKDATA_BRANCH,
             VAR_BANKDATA_PRODUCTCODE,
             VAR_BANKDATA_PRODUCTNM,
             VAR_BANKDATA_REGISTRNO,
             CASE var_banktransdet_paymode
               WHEN 'C' THEN 'Online'
               WHEN 'Q' THEN 'Cheque'
               WHEN 'R' THEN 'Online'
               ELSE var_banktransdet_paymode
             END AS paymode,
             num_banktransdet_paidamt AS paidamt,
             num_banktransdet_chqno AS instrumentno,
             dat_banktransdet_chqdt AS instrumentdt,
             var_banktransdet_bankname AS bankname,
             var_banktransdet_billdeskrefno AS billdeskrefno,
             var_banktransdet_authcode AS authcode,
             var_banktransdet_billdeskmsg AS billdeskmsg,
             var_banktransdet_altrphno1 AS mobileno,
             var_banktransdet_altrphno2 AS altrphno2,
             var_banktransdet_email1 AS email1,
             var_banktransdet_altrnatadd AS address,
             dat_banktransmast_ptpdt AS ptpdate,
             dat_banktransdet_reshudt AS reshudt,
             var_banktransdet_visitremark AS visitremark,
             var_banktransdet_panform AS panform,
             var_banktransdet_pandetails AS pandetails,
             var_banktransdet_settleflag AS settleflag,
             TO_CHAR(dat_banktransdet_transdat, 'dd/mm/yyyy') AS trans_date,
             TO_CHAR(dat_banktransdet_transdat, 'hh24:mi:ss') AS trans_time,
             dat_banktransdet_oflntransdate AS oflntransdate,
             var_banktransdet_golocation AS golocation,
             var_tmfl_uploadflag AS uploadflag,
             var_tmfl_response AS response,
             var_creditlimit_flag AS authorisationflag,
             bd.var_bankdata_cobrowsraddress AS customerAddress,
             var_bankdata_branch AS lenderLocationName,
             var_bankdata_registrno AS Product_Type,
             var_bankdata_customernm AS customername,
             c.var_usermst_empcode AS employecode,
             SUBSTR(var_banktransdet_golocation, 1, INSTR(var_banktransdet_golocation, ',') - 1) AS lattitude,
             SUBSTR(var_banktransdet_golocation, INSTR(var_banktransdet_golocation, ',') + 1) AS longtitude
        FROM atbss.aoup_etech_banktransdetails
        LEFT OUTER JOIN atbss.aoup_etech_bankingtransmast
                ON num_banktransmast_transid = num_banktransdet_transid
        LEFT OUTER JOIN atbss.aoup_etech_bankdata bd
                ON bd.var_bankdata_contractnum = var_banktransmast_contrctno
        LEFT OUTER JOIN atbss.aoup_etech_visitstatus_mst
                ON num_visitstatus_id = var_banktransdet_visitststs
        LEFT OUTER JOIN atbss.aoup_etech_feedbacktype_mst
                ON var_feedbacktype_mst_id = var_banktransdet_custfeedbck
        INNER JOIN etech.aoup_usermst_def c
                ON c.var_usermst_userid = var_banktransdet_userid
        INNER JOIN etech.view_user_level_new
                ON Main_compid = num_usermst_brid
                OR center_compid = num_usermst_brid
                OR Zone_compid = num_usermst_brid
                OR State_compid = num_usermst_brid
                OR branch_compid = num_usermst_brid
        INNER JOIN etech.aoup_usermst_def t
                ON Main_compid = t.num_usermst_brid
                OR center_compid = t.num_usermst_brid
                OR Zone_compid = t.num_usermst_brid
                OR State_compid = t.num_usermst_brid
                OR branch_compid = t.num_usermst_brid
                 WHERE (TO_CHAR(dat_banktransdet_transdat, 'MM-YYYY') = :monthYear
                         OR TO_CHAR(dat_banktransdet_transdat, 'MM - YYYY') = :monthYearWithSpaces)
         AND t.var_usermst_userid = :userId
       ORDER BY dat_banktransdet_transdat
    `;

  const [chart1Result, chart2Result, gridResult] = await Promise.all([
                executeQuery(chart1Sql, isBranchCategory
                        ? {
                                        userId: normalizedUserId,
                                        monthYearWithSpaces: selectedMonthYearWithSpaces,
                                }
                        : {
                                        userId: normalizedUserId,
                                        monthYear: selectedMonthYear,
                                }),
    executeQuery(chart2Sql, { userId: normalizedUserId, month: monthText, year: String(scope.year) }),
                executeQuery(gridSql, {
                        userId: normalizedUserId,
                        monthYear: selectedMonthYear,
                        monthYearWithSpaces: selectedMonthYearWithSpaces,
                }),
  ]);

        const chart1 = buildChartSeries(
                chart1Result.rows,
                totalDays,
                (row) => resolveLegacyChart1Day(row.TRANS_DATE ?? row.trans_date ?? ''),
                (row) => row.NUM_TRANSACTIONS ?? row.num_transactions ?? row.TRANSACTION_COUNT ?? row.transaction_count
        );

        const chart2 = buildChartSeries(
                chart2Result.rows,
                totalDays,
                (row) => row.DAY ?? row.day,
                (row) => row.TRANSACTION_COUNT ?? row.transaction_count ?? row.NUM_TRANSACTIONS ?? row.num_transactions
        );
        const grid = dedupeRowsByTransId(gridResult.rows || []);
        const shouldMaskContractNumber = String(query?.userOf || '') === '1';

        if (shouldMaskContractNumber) {
                grid.forEach((row) => {
                        row.CONTRACTNUM = maskValue(row.CONTRACTNUM);
                });
        }

  return {
    monthYear: selectedMonthYear,
    month: scope.month,
    year: scope.year,
    monthLabel: new Date(scope.year, scope.month - 1, 1).toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
    }),
    chart1,
    chart2,
    grid,
    totalRows: grid.length,
  };
}

module.exports = {
  getDashboardData,
};
