
const oracledb = require('oracledb');
const { executeQuery } = require('../../../db/queryExecutor');
const { executeProcedure } = require('../../../db/procedureExecutor');

function normalizeUserId(userId) {
  const value = String(userId || '').trim();
  if (!value) return value;
  return value.startsWith('E') ? value : `E${value}`;
}


function isValidUlbId(ulbId) {
  return (
    ulbId !== null &&
    ulbId !== undefined &&
    ulbId !== 'ALL' &&
    ulbId !== '0' &&
    ulbId !== 'undefined' &&
    ulbId !== 'null' &&
    !isNaN(Number(ulbId)) &&
    Number(ulbId) > 0
  );
}


function fixDecimalsInJson(str) {
  return str.replace(/(\s|:)\.(\d+)/g, '$10.$2');
}


const FLAG_MAP = {
  'water tax':              'WAT',
  'water':                  'WAT',
  'property tax':           'PT',
  'estate':                 'ESTD',
  'grievances':             'CRMD',
  'grievance':              'CRMD',
  'crmd':                   'CRMD',
  'cfc':                    'CFC',
  'accounts':               'ACCOUNT',
  'account':                'ACCOUNT',
  'acc':                    'ACCOUNT',
  'marriage':               'MRRG',
  'marriage registration':  'MRRG',
  'birth & death':          'BAND',
  'bnd':                    'BAND',
  'fire':                   'FIRE',
  'legal':                  'LEGL',
  'market':                 'MRKT',
  'social welfare':         'SWEL',
  'inward outward':         'INW',
  'asset management':       'ASSET',
  'works':                  'WORKS',
  'rts':                    'RTS',
  'advertisement':          'ADVT',
  'illegal hoarding':       'ILHORD',
  'illegalhoarding':        'ILHORD',
  'illegal hording':        'ILHORD',
  'illegalhording':         'ILHORD',
  'mandap':                 'MNDP',
  'tanker':                 'TNKR',
  'tnkr':                   'TNKR',
};

// Modules where column-3 is Recovery % instead of a plain number
const RECOVERY_PCT_MODULES = ['PTAX', 'WAT', 'CFC', 'MRKT', 'ADVT'];

const fetchDashboardDataNew = async (req, res) => {
  try {
    const { ulbId } = req.query;
    const specificUlb = isValidUlbId(ulbId);

    const params = {};

    // WHERE / JOIN clauses that change based on ALL vs specific corporation
    let ulbCondition = 'AND d.num_dashboard_ulbid NOT IN (550, 1, 5)';
    let configJoin   = '';
    let rtsTotal, rtsApproved, rtsPending;

    if (specificUlb) {
      params.ulbId = Number(ulbId);
      ulbCondition = 'AND d.num_dashboard_ulbid = :ulbId';
      configJoin   = `AND EXISTS (
                        SELECT 1 FROM admins.AOMA_DMADASHBOARDCONFIG_MAS dc
                        WHERE  m.var_module_code               = dc.var_dashboardconfg_modulecode
                          AND  dc.num_dashboardconfg_ulbid     = :ulbId
                          AND  dc.var_dashboardconfg_chr_active = 'Y'
                      )`;

      // Corporation-specific RTS counts (live from vw_dashborddata)
      rtsTotal    = `(SELECT COUNT(*)           FROM aorts.vw_dashborddata WHERE ulbid = :ulbId AND ulbid NOT IN (550,1,5))`;
      rtsApproved = `(SELECT COUNT(*)           FROM aorts.vw_dashborddata WHERE ulbid = :ulbId AND ulbid NOT IN (550,1,5) AND status = 'Approved')`;
      rtsPending  = `(SELECT COUNT(*)           FROM aorts.vw_dashborddata WHERE ulbid = :ulbId AND ulbid NOT IN (550,1,5) AND status IN ('Authorisation Pending','In Process','Verification Pending','Payment Pending'))`;
    } else {
      // ALL corporations — use pre-aggregated summary views (faster)
      rtsTotal    = `(SELECT total_applications    FROM aorts.dmc_dashboard_summary)`;
      rtsApproved = `(SELECT approved_applications FROM aorts.dmc_dashboard_summary)`;
      rtsPending  = `(SELECT pending_applications  FROM aorts.vw_dhulerts_pending_apl)`;
    }

    const sql = `
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
          'link'      VALUE x.var_module_url,
          'code'      VALUE x.var_dasdboard_modulecode,
          'title'     VALUE x.var_module_title,
          'colorcode' VALUE x.colorcode,
          'metrics'   VALUE JSON_ARRAY(
            JSON_OBJECT('label' VALUE x.column1_label, 'value' VALUE x.total_column1),
            JSON_OBJECT('label' VALUE x.column2_label, 'value' VALUE x.total_column2),
            JSON_OBJECT('label' VALUE x.column3_label, 'value' VALUE x.total_column3)
          )
        )
        ORDER BY
          -- RTS card always first
          CASE WHEN x.var_dasdboard_modulecode = 'RTS' THEN 0 ELSE 1 END,
          -- Cards with all-zero data pushed to bottom
          CASE WHEN NVL(x.total_column1,0) = 0
                AND NVL(x.total_column2,0) = 0
                AND NVL(x.total_column3,0) = 0
               THEN 1 ELSE 0 END,
          x.num_module_orderby
        RETURNING CLOB
      ) AS dashboard_json
      FROM (
        SELECT
          d.var_dasdboard_modulecode,
          m.var_module_title,
          m.num_seqno                AS num_module_orderby,
          ''                         AS var_module_url,

          -- Column 1: RTS → live count, others → stored aggregate
          CASE WHEN d.var_dasdboard_modulecode = 'RTS'
               THEN ${rtsTotal}
               ELSE SUM(NVL(d.num_dasdboard_column1, 0))
          END AS total_column1,

          -- Column 2: RTS → approved count, others → stored aggregate
          CASE WHEN d.var_dasdboard_modulecode = 'RTS'
               THEN ${rtsApproved}
               ELSE SUM(NVL(d.num_dasdboard_column2, 0))
          END AS total_column2,

          -- Column 3: recovery % for financial modules, pending for RTS, aggregate otherwise
          CASE
            WHEN d.var_dasdboard_modulecode IN ('PTAX','WAT','CFC','MRKT','ADVT')
              THEN ROUND(SUM(NVL(d.num_dasdboard_column2,0)) * 100
                       / NULLIF(SUM(NVL(d.num_dasdboard_column1,0)), 0), 2)
            WHEN d.var_dasdboard_modulecode = 'RTS'
              THEN ${rtsPending}
            ELSE SUM(NVL(d.num_dasdboard_column3, 0))
          END AS total_column3,

          MAX(c1.var_column_label) AS column1_label,
          MAX(c2.var_column_label) AS column2_label,
          MAX(c3.var_column_label) AS column3_label,

          -- Freshness colour: ≤30 days = GREEN, >30 = YELLOW
          CASE
            WHEN MAX(SYSDATE - d.dat_dasdboard_transdt) <= 30 THEN 'GREEN'
            WHEN MAX(SYSDATE - d.dat_dasdboard_transdt) >  30 THEN 'YELLOW'
            ELSE 'Light_Coral'
          END AS colorcode

        FROM admins.aoms_dashboard_det d

        INNER JOIN admins.aoms_dashboard_module_mst m
               ON  m.var_module_code    = d.var_dasdboard_modulecode
              AND  d.num_dashboard_ulbid = m.num_ulbid

        LEFT JOIN admins.aoms_dashboard_module_column_mst c1
               ON  c1.var_module_code = d.var_dasdboard_modulecode
              AND  c1.num_column_no   = 1
              AND  c1.chr_active      = 'Y'

        LEFT JOIN admins.aoms_dashboard_module_column_mst c2
               ON  c2.var_module_code = d.var_dasdboard_modulecode
              AND  c2.num_column_no   = 2
              AND  c2.chr_active      = 'Y'

        LEFT JOIN admins.aoms_dashboard_module_column_mst c3
               ON  c3.var_module_code = d.var_dasdboard_modulecode
              AND  c3.num_column_no   = 3
              AND  c3.chr_active      = 'Y'

        WHERE m.chr_active = 'Y'
          ${ulbCondition}
          ${configJoin}

        GROUP BY
          d.var_dasdboard_modulecode,
          m.var_module_title,
          m.num_seqno
        ORDER BY m.num_seqno
      ) x
    `;

    const result = await executeQuery(sql, params, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    if (!result.rows || result.rows.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // CLOB → string
    const lob = result.rows[0].DASHBOARD_JSON;
    let jsonString = '';
    if (lob && lob.setEncoding) {
      jsonString = await new Promise((resolve, reject) => {
        let buf = '';
        lob.setEncoding('utf8');
        lob.on('data',  chunk => { buf += chunk; });
        lob.on('end',   ()    => resolve(buf));
        lob.on('error', reject);
      });
    } else {
      jsonString = lob || '';
    }

    const parsedJSON = JSON.parse(fixDecimalsInJson(jsonString));

    // Post-process module data
    if (Array.isArray(parsedJSON)) {
      parsedJSON.forEach(mod => {
        // Illegal Hoarding: swap metrics[1] and metrics[2]
        if (mod.code === 'ILGLHRD' && mod.metrics?.length >= 3) {
          [mod.metrics[1], mod.metrics[2]] = [mod.metrics[2], mod.metrics[1]];
        }

        // Financial modules: label + format Recovery %
        if (RECOVERY_PCT_MODULES.includes(mod.code) && mod.metrics?.[2]) {
          mod.metrics[2].label = 'Recovery Percentage';
          if (mod.metrics[2].value != null) {
            mod.metrics[2].value = `${mod.metrics[2].value}%`;
          }
        }
      });
    }

    return res.json({ success: true, data: parsedJSON });

  } catch (err) {
    console.error('Dashboard Fetch Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


const fetchULBList = async (req, res) => {
  try {
    const sql = `
      SELECT
        num_corporation_id    AS corpid,
        var_corporation_name  AS marname,
        var_corporation_mname AS engname,
        var_corporation_code  AS corpcode
      FROM admins.aoma_corporation_mas
      WHERE LOWER(var_corporation_mname) LIKE '%corporation%'
         OR var_corporation_name         LIKE '%महानगरपालिका%'
      ORDER BY var_corporation_mname ASC
    `;

    const result = await executeQuery(sql, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return res.json({ success: true, data: result.rows || [] });

  } catch (err) {
    console.error('ULB List Fetch Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


const fetchLastSyncDate = async (req, res) => {
  try {
    const { ulbId } = req.query;
    const params = {};

    let whereClause;
    if (isValidUlbId(ulbId)) {
      whereClause = 'WHERE num_dashboard_ulbid = :ulbId';
      params.ulbId = Number(ulbId);
    } else {
      whereClause = 'WHERE num_dashboard_ulbid = 1670';
    }

    const sql = `
      SELECT TO_CHAR(NVL(MAX(dat_dasdboard_transsryncdt), SYSDATE), 'DD Mon YYYY HH:MI AM') AS LAST_SYNC_DATE
      FROM admins.aoms_dashboard_det
      ${whereClause}
    `;

    const result = await executeQuery(sql, params, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    const data   = result.rows?.[0]?.LAST_SYNC_DATE ?? null;
    return res.json({ success: true, data });

  } catch (err) {
    console.error('Last Sync Date Fetch Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


const RTS_CTE = `
  WITH dashbord AS (
    SELECT
      var_dept_engname, var_service_eng_name,
      num_application_deptid, num_application_serviceid,
      CASE WHEN status = 'New'                   THEN 1 ELSE 0 END AS new,
      CASE WHEN status = 'Approved'              THEN 1 ELSE 0 END AS approved,
      CASE WHEN status = 'Verification Pending'  THEN 1 ELSE 0 END AS verification_pending,
      CASE WHEN status = 'In Process'            THEN 1 ELSE 0 END AS in_process,
      CASE WHEN status = 'Denied'                THEN 1 ELSE 0 END AS denied,
      CASE WHEN status = 'Delivered'             THEN 1 ELSE 0 END AS deliverd,
      CASE WHEN status IN ('Authorisation Pending','In Process','Verification Pending')
                                                 THEN 1 ELSE 0 END AS authorisation_pending,
      CASE WHEN status IN ('Authorisation Reject','Denied')
                                                 THEN 1 ELSE 0 END AS authorisation_reject,
      CASE WHEN status = 'Payment Pending'       THEN 1 ELSE 0 END AS payment_pending,
      CASE WHEN status IS NOT NULL               THEN 1 ELSE 0 END AS total,
      application_status, ulbid
    FROM aorts.vw_dashborddata
    WHERE ulbid NOT IN (550, 1, 5)
  )
`;


const fetchRTSULBWiseData = async (req, res) => {
  try {
    const { ulbId } = req.query;
    const binds = {};
    let whereClause = '';

    if (isValidUlbId(ulbId)) {
      whereClause = 'AND ulbid = :ulbId';
      binds.ulbId = Number(ulbId);
    }

    const sql = `
      ${RTS_CTE}
      SELECT
        var_corporation_shortname, num_corporation_id,
        SUM(new)                  AS new,
        SUM(approved)             AS approved,
        SUM(verification_pending) AS verification_pending,
        SUM(in_process)           AS process,
        SUM(denied)               AS denied,
        SUM(deliverd)             AS deliverd,
        SUM(authorisation_pending) AS authorisation_pending,
        SUM(authorisation_reject)  AS authorisation_reject,
        SUM(payment_pending)       AS payment_pending,
        SUM(total)                 AS total
      FROM dashbord
      INNER JOIN admins.aoma_corporation_mas ON num_corporation_id = ulbid
      ${whereClause}
      GROUP BY var_corporation_shortname, num_corporation_id, var_corporation_name
      ORDER BY var_corporation_name
    `;

    const result = await executeQuery(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return res.json({ success: true, data: result.rows || [] });

  } catch (err) {
    console.error('RTS ULB Wise Fetch Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


const fetchRTSULBDeptWiseData = async (req, res) => {
  try {
    const { ulbId } = req.query;

    if (!ulbId) {
      return res.status(400).json({ success: false, message: 'ulbId is required' });
    }

    const sql = `
      ${RTS_CTE}
      SELECT
        var_dept_engname, num_application_deptid,
        SUM(new)                   AS new,
        SUM(approved)              AS approved,
        SUM(verification_pending)  AS verification_pending,
        SUM(in_process)            AS process,
        SUM(denied)                AS denied,
        SUM(deliverd)              AS deliverd,
        SUM(authorisation_pending) AS authorisation_pending,
        SUM(authorisation_reject)  AS authorisation_reject,
        SUM(payment_pending)       AS payment_pending,
        SUM(total)                 AS total
      FROM dashbord
      WHERE ulbid = :ulbId
      GROUP BY var_dept_engname, num_application_deptid
    `;

    const result = await executeQuery(sql, { ulbId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return res.json({ success: true, data: result.rows || [] });

  } catch (err) {
    console.error('RTS ULB Dept Wise Fetch Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


const fetchRTSULBServiceWiseData = async (req, res) => {
  try {
    const { ulbId, deptId } = req.query;

    if (!ulbId || !deptId) {
      return res.status(400).json({ success: false, message: 'ulbId and deptId are required' });
    }

    const sql = `
      ${RTS_CTE}
      SELECT
        var_service_eng_name,
        SUM(new)                   AS new,
        SUM(approved)              AS approved,
        SUM(verification_pending)  AS verification_pending,
        SUM(in_process)            AS process,
        SUM(denied)                AS denied,
        SUM(deliverd)              AS deliverd,
        SUM(authorisation_pending) AS authorisation_pending,
        SUM(authorisation_reject)  AS authorisation_reject,
        SUM(payment_pending)       AS payment_pending,
        SUM(total)                 AS total
      FROM dashbord
      WHERE ulbid = :ulbId
        AND num_application_deptid = :deptId
      GROUP BY var_service_eng_name
    `;

    const result = await executeQuery(sql, { ulbId, deptId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return res.json({ success: true, data: result.rows || [] });

  } catch (err) {
    console.error('RTS ULB Service Wise Fetch Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


const fetchRTSStatusWiseData = async (req, res) => {
  try {
    const { status, ulbId } = req.query;

    if (!status) {
      return res.status(400).json({ success: false, message: 'status is required' });
    }

    const isTotal = (status === 'TOT');
    const params  = {};

    // Dynamic column: total count vs specific status count
    const statusColumn = isTotal
      ? 'SUM(total) AS status'
      : `CASE application_status
           WHEN 'NW' THEN SUM(new)
           WHEN 'AP' THEN SUM(approved)
           WHEN 'VP' THEN SUM(verification_pending)
           WHEN 'IP' THEN SUM(in_process)
           WHEN 'DN' THEN SUM(denied)
           WHEN 'DL' THEN SUM(deliverd)
           WHEN 'CP' THEN SUM(authorisation_pending)
           WHEN 'CR' THEN SUM(authorisation_reject)
           WHEN 'PP' THEN SUM(payment_pending)
         END AS status,
         application_status`;

    let sql = `
      ${RTS_CTE}
      SELECT
        var_dept_engname, num_application_deptid,
        ${statusColumn}
      FROM dashbord
      WHERE 1 = 1
    `;

    if (!isTotal) {
      sql += ' AND application_status = :status ';
      params.status = status;
    }
    if (ulbId) {
      sql += ' AND ulbid = :ulbId ';
      params.ulbId = ulbId;
    }

    sql += isTotal
      ? ' GROUP BY var_dept_engname, num_application_deptid'
      : ' GROUP BY var_dept_engname, num_application_deptid, application_status';

    const result = await executeQuery(sql, params, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return res.json({ success: true, data: result.rows || [] });

  } catch (err) {
    console.error('RTS Status Wise Fetch Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


const fetchRTSApplicationDetailData = async (req, res) => {
  try {
    const { dept, status, ulbId } = req.query;

    if (!dept || !status) {
      return res.status(400).json({ success: false, message: 'dept and status are required' });
    }

    let sql = `
      SELECT
        VAR_DEPT_ENGNAME                                   AS DEPTNAME,
        VAR_SERVICE_ENG_NAME                               AS SERVICENAME,
        OWNERNAME                                          AS OWNERNAME,
        VAR_APPL_MOBNO                                     AS MOBNO,
        VAR_APPL_EMAIL                                     AS EMAIL,
        TO_CHAR(DAT_APPLICATION_INSDATE,    'DD-MM-YYYY')  AS APPLIDATE,
        AMOUNT                                             AS AMOUNT,
        TO_CHAR(DAT_APPLICATION_RECIEPTDATE, 'DD-MM-YYYY') AS RECIEPTDATE,
        STATUS                                             AS STATUS,
        TO_CHAR(DAT_APPLICATION_DELIVEREDDATE,'DD-MM-YYYY') AS CERTIISSDATE
      FROM aorts.vw_dashborddata
      WHERE NUM_APPLICATION_DEPTID = :dept
    `;

    const params = { dept };

    if (status !== 'TOT') {
      sql += ' AND application_status = :status';
      params.status = status;
    }
    if (ulbId) {
      sql += ' AND ulbid = :ulbId';
      params.ulbId = ulbId;
    }

    const result = await executeQuery(sql, params, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return res.json({ success: true, data: result.rows || [] });

  } catch (err) {
    console.error('RTS Application Detail Fetch Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


const fetchWaterTaxTotalDemand = async (req, res) => {
  try {
    const rawUlbId   = req.query.ulbId;
    const fromDate   = req.query.fromDate || '01-Apr-2026';
    const specificUlb = isValidUlbId(rawUlbId);
    const ulbId      = specificUlb ? Number(rawUlbId) : null;

    const whereClause = specificUlb
      ? "WHERE num_billprint_ulbid = :ulbId AND TRUNC(dat_billprint_insdate) >= TO_DATE(:fromDate, 'DD-Mon-YYYY')"
      : "WHERE TRUNC(dat_billprint_insdate) >= TO_DATE(:fromDate, 'DD-Mon-YYYY')";

    const binds = specificUlb ? { ulbId, fromDate } : { fromDate };

    const sql = `
      SELECT ROUND(
        SUM(NVL(num_billprint_btotaltax, 0) + NVL(num_billprint_ctotaltax, 0)) / 10000000,
        2
      ) AS demand
      FROM water.aowt_billprint_mas
      ${whereClause}
    `;

    const result = await executeQuery(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    const demand = result.rows?.[0]?.DEMAND || 0;
    return res.json({ success: true, data: { demand } });

  } catch (err) {
    console.error('Water Tax Total Demand Fetch Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


const fetchMonthwiseData = async (req, res) => {
  try {
    // ulbId can come from body (POST) or query (GET); 0 = ALL corporations
    const rawUlbId = req.body?.ulbId || req.body?.ulbid || req.query?.ulbId || req.query?.ulbid;
    const ulbId    = isValidUlbId(rawUlbId) ? Number(rawUlbId) : 0;

    const flag   = req.body?.flag  || req.query?.flag  || '';
    const userId = req.user?.userid || req.body?.userId || req.query?.userId || '1';

    // Map human-readable card title → Oracle procedure flag code
    const dbFlag = FLAG_MAP[flag.toLowerCase().trim()] || flag || '';

    console.log(`[MonthwiseFetch] ulbId=${ulbId} (raw=${rawUlbId}), flag=${dbFlag}`);

    const procedureParams = [
      { value: normalizeUserId(userId), type: oracledb.STRING },
      { value: ulbId,                   type: oracledb.NUMBER },
      { value: dbFlag,                  type: oracledb.STRING },
      { out: true,                      type: oracledb.NUMBER }, // p4 = error code
      { out: true,                      type: oracledb.STRING }, // p5 = error message
      { out: true,                      type: oracledb.CLOB   }, // p6 = JSON result
    ];

    const result = await executeProcedure({
      name:   'admins.aoma_dmadashboardmonthwise_fetch',
      params: procedureParams,
    });

    if (!result.success || !result.outBinds) {
      return res.status(500).json({ success: false, message: 'Procedure execution failed' });
    }

    const { p4: errCode, p5: errMsg, p6: clobString } = result.outBinds;

    // Oracle convention: 9999 or 0 = success; anything else = error
    const isDbError = errCode != null && errCode !== 0 && errCode !== 9999;
    if (isDbError) {
      return res.status(400).json({ success: false, message: errMsg || 'Error from DB' });
    }

    let parsedData = JSON.parse(fixDecimalsInJson(clobString || '[]'));

    // Market module: calculate Recovery % from demand & collection columns
    if (dbFlag === 'MRKT' && Array.isArray(parsedData)) {
      parsedData = parsedData.map(item => {
        const demand     = Number(item.total_demand     || item.totalDemand     || 0);
        const collection = Number(item.total_collection || item.totalCollection) ||
                           (Number(item.cash_collection   || 0) +
                            Number(item.cheque_collection || 0) +
                            Number(item.online_collection || 0));

        const recoveryPercentage = demand > 0
          ? Number(((collection / demand) * 100).toFixed(2))
          : 0;

        return { ...item, total_demand: demand, total_collection: collection, recovery_percentage: recoveryPercentage };
      });
    }

    return res.json({ success: true, dbFlag, data: parsedData });

  } catch (err) {
    console.error('fetchMonthwiseData Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


const fetchEstateStats = async (req, res) => {
  try {
    const ulbId = req.query.ulbId ? Number(req.query.ulbId) : 1670;

    const sql = `
      SELECT
        total_properties,
        lease_properties,
        rented_properties,
        vacant_properties
      FROM admins.view_Estate_prop_count
      WHERE num_prop_ulbid = :ulbId
    `;

    const result = await executeQuery(sql, { ulbId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    const row    = result.rows?.[0] || {};

    return res.json({
      success: true,
      data: {
        total_properties:  Number(row.TOTAL_PROPERTIES  ?? row.total_properties)  || 0,
        lease_properties:  Number(row.LEASE_PROPERTIES  ?? row.lease_properties)  || 0,
        rented_properties: Number(row.RENTED_PROPERTIES ?? row.rented_properties) || 0,
        vacant_properties: Number(row.VACANT_PROPERTIES ?? row.vacant_properties) || 0,
      },
    });

  } catch (err) {
    console.error('Estate Stats Fetch Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


module.exports = {
  fetchDashboardDataNew,
  fetchULBList,
  fetchLastSyncDate,
  fetchRTSULBWiseData,
  fetchRTSULBDeptWiseData,
  fetchRTSULBServiceWiseData,
  fetchRTSStatusWiseData,
  fetchRTSApplicationDetailData,
  fetchWaterTaxTotalDemand,
  fetchMonthwiseData,
  fetchEstateStats,
};
  