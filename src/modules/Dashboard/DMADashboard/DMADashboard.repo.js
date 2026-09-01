
const oracledb = require('oracledb');
const { executeQuery } = require('../../../db/queryExecutor');

/**
 * Normalize user ID to ensure it starts with 'E'
 */
function normalizeUserId(userId) {
  const value = String(userId || '').trim();
  if (!value) {
    return value;
  }
  return value.startsWith('E') ? value : `E${value}`;
}

/**
 * Pad a value with leading zeros to 2 digits
 */
function pad2(value) {
  return String(value).padStart(2, '0');
}

/**
 * Get number of days in a month
 */
function daysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

/**
 * Fetch DMA Dashboard data with module metrics and status information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const fetchDashboardDataNew = async (req, res) => {
  try {
    const { ulbId } = req.query;

    let ulbCondition = "AND d.num_dashboard_ulbid NOT IN (550, 1, 5)";
    let configJoin = "";
    const params = {};

    if (ulbId && ulbId !== 'ALL') {
      ulbCondition = "AND d.num_dashboard_ulbid = :ulbId";
      configJoin = "AND EXISTS (SELECT 1 FROM admins.AOMA_DMADASHBOARDCONFIG_MAS dc WHERE m.var_module_code = dc.var_dashboardconfg_modulecode AND dc.num_dashboardconfg_ulbid = :ulbId AND dc.var_dashboardconfg_chr_active = 'Y')";
      params.ulbId = Number(ulbId);
    }

    const sql = `
      SELECT JSON_ARRAYAGG(
         JSON_OBJECT(
         'link' VALUE x.var_module_url,
           'code' VALUE x.var_dasdboard_modulecode,
           'title' VALUE x.var_module_title,
           'colorcode' VALUE x.colorcode,
           'metrics' VALUE JSON_ARRAY(
               JSON_OBJECT(
                   'label' VALUE x.column1_label,
                   'value' VALUE x.total_column1
               ),
               JSON_OBJECT(
                   'label' VALUE x.column2_label,
                   'value' VALUE x.total_column2
               ),
               JSON_OBJECT(
                   'label' VALUE x.column3_label,
                   'value' VALUE x.total_column3
               )
           )
         )
          ORDER BY
          CASE WHEN x.var_dasdboard_modulecode = 'RTS' THEN 0 ELSE 1 END,
          CASE
              WHEN NVL(x.total_column1,0) = 0
               AND NVL(x.total_column2,0) = 0
               AND NVL(x.total_column3,0) = 0
              THEN 1
              ELSE 0
          END,
          x.num_module_orderby
        
    RETURNING CLOB
       ) AS dashboard_json
FROM
(
    SELECT
        d.var_dasdboard_modulecode,
        m.var_module_title,
        m.num_seqno,  m.num_seqno AS num_module_orderby,
        '' AS var_module_url,
           case when d.var_dasdboard_modulecode = 'RTS' then 
        (select total_applications from aorts.dmc_dashboard_summary) else
        SUM(NVL(d.num_dasdboard_column1,0))end AS total_column1,


  case when d.var_dasdboard_modulecode = 'RTS' then 
        (select approved_applications from aorts.dmc_dashboard_summary) else
        SUM(NVL(d.num_dasdboard_column2,0)) end  AS total_column2,

 CASE
            WHEN d.var_dasdboard_modulecode IN ('PTAX','WAT','CFC','MRKT')
            THEN ROUND(SUM(NVL(d.num_dasdboard_column2,0))* 100 /NULLIF(SUM(NVL(d.num_dasdboard_column1,0)),0),2 )
             when d.var_dasdboard_modulecode = 'RTS' then
            (select pending_applications from aorts.vw_dhulerts_pending_apl)
            ELSE SUM(NVL(d.num_dasdboard_column3,0))
        END AS total_column3,


        MAX(c1.var_column_label) AS column1_label,
        MAX(c2.var_column_label) AS column2_label,
        MAX(c3.var_column_label) AS column3_label,

        CASE
            WHEN MAX(SYSDATE - d.dat_dasdboard_transdt) <= 30 THEN 'GREEN'
            WHEN MAX(SYSDATE - d.dat_dasdboard_transdt) > 30 THEN 'YELLOW'
            ELSE 'Light_Coral'
        END AS colorcode

    FROM admins.aoms_dashboard_det d

    INNER JOIN admins.aoms_dashboard_module_mst m
        ON m.var_module_code = d.var_dasdboard_modulecode
       AND d.num_dashboard_ulbid = m.num_ulbid

    LEFT JOIN admins.aoms_dashboard_module_column_mst c1
        ON c1.var_module_code = d.var_dasdboard_modulecode
       AND c1.num_column_no = 1
       AND c1.chr_active = 'Y'

    LEFT JOIN admins.aoms_dashboard_module_column_mst c2
        ON c2.var_module_code = d.var_dasdboard_modulecode
       AND c2.num_column_no = 2
       AND c2.chr_active = 'Y'

    LEFT JOIN admins.aoms_dashboard_module_column_mst c3
        ON c3.var_module_code = d.var_dasdboard_modulecode
       AND c3.num_column_no = 3
       AND c3.chr_active = 'Y'

    WHERE m.chr_active = 'Y'
      ${ulbCondition}
      ${configJoin}

   GROUP BY
        d.var_dasdboard_modulecode,
        m.var_module_title,
        m.num_seqno
order by m.num_seqno
) x
	`;

    const result = await executeQuery(sql, params, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });

    if (!result.rows || result.rows.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const lob = result.rows[0].DASHBOARD_JSON;

    let jsonString = "";
    if (lob && lob.setEncoding) {
      jsonString = await new Promise((resolve, reject) => {
        let clobData = "";
        lob.setEncoding("utf8");
        lob.on("data", chunk => clobData += chunk);
        lob.on("end", () => resolve(clobData));
        lob.on("error", reject);
      });
    } else {
      jsonString = lob;
    }

    // Fix bad decimals like ".02" → "0.02"
    const fixedJson = jsonString.replace(/(\s|:)\.(\d+)/g, "$10.$2");

    const parsedJSON = JSON.parse(fixedJson);

    // Fix labels and formatting for Recovery Percentage modules
    if (Array.isArray(parsedJSON)) {
      parsedJSON.forEach(module => {
        if (['PTAX', 'WAT', 'CFC', 'MRKT'].includes(module.code)) {
          if (module.metrics && module.metrics[2]) {
            // Remove "(Amount in Cr)" from the label
            module.metrics[2].label = "Recovery Percentage";
            // Append % so frontend doesn't treat it as currency
            if (module.metrics[2].value !== null && module.metrics[2].value !== undefined) {
              module.metrics[2].value = `${module.metrics[2].value}%`;
            }
          }
        }
      });
    }

    res.json({ success: true, data: parsedJSON });

  } catch (err) {
    console.error("Dashboard Fetch Error:", err);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Fetch ULB (Corporation) list for dropdown
 * Filters only Municipal Corporations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const fetchULBList = async (req, res) => {
  try {
    const sql = `
      SELECT
        num_corporation_id   AS corpid,
        var_corporation_name AS marname,
        var_corporation_mname AS engname,
        var_corporation_code AS corpcode
      FROM admins.aoma_corporation_mas
      WHERE LOWER(var_corporation_mname) LIKE '%corporation%'
         OR var_corporation_name LIKE '%महानगरपालिका%'
      ORDER BY var_corporation_mname ASC
    `;

    const result = await executeQuery(sql, {}, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });

    const data = result.rows || [];

    res.json({ success: true, data });

  } catch (err) {
    console.error("ULB List Fetch Error:", err);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
/**
 * Fetch RTS ULB Wise data with application status breakdown
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const fetchRTSULBWiseData = async (req, res) => {
  try {
    const ulbId = req.query.ulbId;
    let whereClause = "";
    const binds = {};

    if (ulbId && ulbId !== 'ALL' && ulbId !== 'null' && ulbId !== 'undefined') {
      whereClause += " AND ulbid = :ulbId";
      binds.ulbId = Number(ulbId);
    }

    const sql = `
      WITH dashbord
           AS (SELECT var_dept_engname, var_service_eng_name,
                      num_application_deptid, num_application_serviceid,
                      CASE WHEN status = 'New' THEN 1 ELSE 0 END AS new,
                      CASE WHEN status = 'Approved' THEN 1 ELSE 0 END AS approved,
                      CASE WHEN status = 'Verification Pending' THEN 1 ELSE 0 END AS verification_pending,
                      CASE WHEN status = 'In Process' THEN 1 ELSE 0 END AS in_process,
                      CASE WHEN status = 'Denied' THEN 1 ELSE 0 END AS denied,
                      CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END AS deliverd,
                      CASE WHEN status IN ('Authorisation Pending', 'In Process', 'Verification Pending') THEN 1 ELSE 0 END AS authorisation_pending,
                      CASE WHEN status IN ('Authorisation Reject', 'Denied') THEN 1 ELSE 0 END AS authorisation_reject,
                      CASE WHEN status = 'Payment Pending' THEN 1 ELSE 0 END AS payment_pending,
                      CASE WHEN status IS NOT NULL THEN 1 ELSE 0 END AS total,
                      application_status, ulbid
                 FROM aorts.vw_dashborddata
                WHERE ulbid NOT IN (550, 1, 5))
      SELECT var_corporation_shortname, num_corporation_id, SUM (new) new,
             SUM (approved) approved,
             SUM (verification_pending) verification_pending,
             SUM (in_process) process, SUM (denied) denied, SUM (deliverd) deliverd,
             SUM (authorisation_pending) authorisation_pending,
             SUM (authorisation_reject) authorisation_reject,
             SUM (payment_pending) payment_pending, SUM (total) total
        FROM dashbord
             INNER JOIN admins.aoma_corporation_mas ON num_corporation_id = ulbid
			  ${whereClause} 
      GROUP BY var_corporation_shortname, num_corporation_id, var_corporation_name
      ORDER BY var_corporation_name
    `;

    const result = await executeQuery(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });

    const data = result.rows || [];

    res.json({ success: true, data: data });

  } catch (err) {
    console.error("RTS ULB Wise Fetch Error:", err);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Fetch RTS ULB Department Wise data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const fetchRTSULBDeptWiseData = async (req, res) => {
  try {
    const { ulbId } = req.query;

    if (!ulbId) {
      return res.status(400).json({
        success: false,
        message: "ulbId is required"
      });
    }

    const sql = `
      with dashbord as( 
        select var_dept_engname,var_service_eng_name, num_application_deptid, num_application_serviceid, 
        case when status= 'New' then 1 else 0 end as New, 
        case when status = 'Approved' then 1 else 0 end as Approved, 
        case when status = 'Verification Pending' then 1 else 0 end as Verification_Pending, 
        case when status = 'In Process' then 1 else 0 end as in_Process, 
        case when status = 'Denied' then 1 else 0 end as Denied, 
        case when status = 'Delivered' then 1 else 0 end as Deliverd, 
        case when status in ('Authorisation Pending','In Process','Verification Pending') then 1 else 0 end as Authorisation_Pending, 
        case when status in ('Authorisation Reject','Denied') then 1 else 0 end as Authorisation_Reject, 
        case when status = 'Payment Pending' then 1 else 0 end as Payment_Pending,  
        case when status is not null then 1 else 0 end as total,application_status,ulbid 
        from aorts.vw_dashborddata  where ulbid not in ( 550,1,5) 
      ) 
      select
        var_dept_engname ,num_application_deptid, 
        sum(New) New,sum(Approved) Approved,sum(Verification_Pending) Verification_Pending 
        ,sum(in_Process) Process,sum(Denied) Denied,sum(Deliverd) Deliverd,sum(Authorisation_Pending) Authorisation_Pending, 
        sum(Authorisation_Reject) Authorisation_Reject,sum(Payment_Pending) Payment_Pending,sum(total) total 
      from dashbord 
      where ulbid = :ulbId
      group by var_dept_engname ,num_application_deptid
    `;

    const result = await executeQuery(sql, { ulbId }, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });

    const data = result.rows || [];

    res.json({ success: true, data: data });

  } catch (err) {
    console.error("RTS ULB Dept Wise Fetch Error:", err);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Fetch RTS ULB Service Wise data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const fetchRTSULBServiceWiseData = async (req, res) => {
  try {
    const { ulbId, deptId } = req.query;

    if (!ulbId || !deptId) {
      return res.status(400).json({
        success: false,
        message: "ulbId and deptId are required"
      });
    }

    const sql = `
      with dashbord as( 
        select var_dept_engname,var_service_eng_name, num_application_deptid, num_application_serviceid, 
        case when status= 'New' then 1 else 0 end as New, 
        case when status = 'Approved' then 1 else 0 end as Approved, 
        case when status = 'Verification Pending' then 1 else 0 end as Verification_Pending, 
        case when status = 'In Process' then 1 else 0 end as in_Process, 
        case when status = 'Denied' then 1 else 0 end as Denied, 
        case when status = 'Delivered' then 1 else 0 end as Deliverd, 
        case when status in ('Authorisation Pending','In Process','Verification Pending') then 1 else 0 end as Authorisation_Pending, 
        case when status in ('Authorisation Reject','Denied') then 1 else 0 end as Authorisation_Reject, 
        case when status = 'Payment Pending' then 1 else 0 end as Payment_Pending,  
        case when status is not null then 1 else 0 end as total,application_status,ulbid 
        from aorts.vw_dashborddata  where ulbid not in ( 550,1,5) 
      ) 
      select 
        var_service_eng_name , 
        sum(New) New,sum(Approved) Approved,sum(Verification_Pending) Verification_Pending 
        ,sum(in_Process) Process,sum(Denied) Denied,sum(Deliverd) Deliverd,sum(Authorisation_Pending) Authorisation_Pending, 
        sum(Authorisation_Reject) Authorisation_Reject,sum(Payment_Pending) Payment_Pending,sum(total) total 
      from dashbord 
      where num_application_deptid = :deptId and ulbid = :ulbId
      group by var_service_eng_name
    `;

    const result = await executeQuery(sql, { ulbId, deptId }, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });

    const data = result.rows || [];

    res.json({ success: true, data: data });

  } catch (err) {
    console.error("RTS ULB Service Wise Fetch Error:", err);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Fetch RTS Status Wise data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const fetchRTSStatusWiseData = async (req, res) => {
  try {
    const { status, ulbId } = req.query;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "status is required"
      });
    }

    let sql = `
      with dashbord as( 
        select var_dept_engname,var_service_eng_name, num_application_deptid, num_application_serviceid, 
        case when status= 'New' then 1 else 0 end as New, 
        case when status = 'Approved' then 1 else 0 end as Approved, 
        case when status = 'Verification Pending' then 1 else 0 end as Verification_Pending, 
        case when status = 'In Process' then 1 else 0 end as in_Process, 
        case when status = 'Denied' then 1 else 0 end as Denied, 
        case when status = 'Delivered' then 1 else 0 end as Deliverd, 
        case when status in ('Authorisation Pending','In Process','Verification Pending') then 1 else 0 end as Authorisation_Pending, 
        case when status in ('Authorisation Reject','Denied') then 1 else 0 end as Authorisation_Reject, 
        case when status = 'Payment Pending' then 1 else 0 end as Payment_Pending,  
        case when status is not null then 1 else 0 end as total,application_status,ulbid 
        from aorts.vw_dashborddata  where ulbid not in ( 550,1,5) 
      ) 
      select 
        var_dept_engname,num_application_deptid,
        ${status === 'TOT'
        ? 'SUM(total) status'
        : `case application_status 
              when 'NW' then SUM (new) 
              when 'AP' then SUM(approved) 
              when 'VP' then SUM(verification_pending) 
              when 'IP' then SUM(in_process) 
              when 'DN' then SUM(denied) 
              when 'DL' then SUM(deliverd) 
              when 'CP' then SUM(authorisation_pending) 
              when 'CR' then SUM(authorisation_reject) 
              when 'PP' then SUM(payment_pending) 
             end status, application_status`
      }
      FROM dashbord 
      WHERE 1 = 1 
    `;

    const params = {};

    if (status !== 'TOT') {
      sql += ` AND application_status = :status `;
      params.status = status;
      if (ulbId) {
        sql += ` AND ulbid = :ulbId `;
        params.ulbId = ulbId;
      }
      sql += ` GROUP BY var_dept_engname,num_application_deptid, application_status `;
    } else {
      if (ulbId) {
        sql += ` AND ulbid = :ulbId `;
        params.ulbId = ulbId;
      }
      sql += ` GROUP BY var_dept_engname,num_application_deptid `;
    }

    const result = await executeQuery(sql, params, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });

    const data = result.rows || [];

    res.json({ success: true, data: data });

  } catch (err) {
    console.error("RTS Status Wise Fetch Error:", err);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
/**
 * Fetch RTS Application Detail data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const fetchRTSApplicationDetailData = async (req, res) => {
  try {
    const { dept, status, ulbId } = req.query;

    if (!dept || !status) {
      return res.status(400).json({
        success: false,
        message: "dept and status are required"
      });
    }

    let sql = `
      SELECT 
        VAR_DEPT_ENGNAME as DEPTNAME,
        VAR_SERVICE_ENG_NAME as SERVICENAME,
        OWNERNAME as OWNERNAME,
        VAR_APPL_MOBNO as MOBNO,
        VAR_APPL_EMAIL as EMAIL,
        TO_CHAR(DAT_APPLICATION_INSDATE, 'DD-MM-YYYY') as APPLIDATE,
        AMOUNT as AMOUNT,
        TO_CHAR(DAT_APPLICATION_RECIEPTDATE, 'DD-MM-YYYY') as RECIEPTDATE,
        STATUS as STATUS,
        TO_CHAR(DAT_APPLICATION_DELIVEREDDATE, 'DD-MM-YYYY') as CERTIISSDATE
      FROM aorts.vw_dashborddata
      WHERE NUM_APPLICATION_DEPTID = :dept
    `;

    const params = { dept };

    if (status !== 'TOT') {
      sql += ` AND application_status = :status`;
      params.status = status;
    }

    if (ulbId) {
      sql += ` AND ulbid = :ulbId`;
      params.ulbId = ulbId;
    }

    const result = await executeQuery(sql, params, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });

    const data = result.rows || [];

    res.json({ success: true, data: data });

  } catch (err) {
    console.error("RTS Application Detail Fetch Error:", err);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Fetch Last Sync Date
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const fetchLastSyncDate = async (req, res) => {
  try {
    const { ulbId } = req.query;

    let ulbCondition = "";
    const params = {};

    if (ulbId && ulbId !== 'ALL' && ulbId !== 'null' && ulbId !== 'undefined') {
      ulbCondition = "WHERE num_dashboard_ulbid = :ulbId";
      params.ulbId = Number(ulbId);
    } else {
      ulbCondition = "WHERE num_dashboard_ulbid = 1670";
    }

    const sql = `
      SELECT TO_CHAR( NVL(MAX(dat_dasdboard_transsryncdt),SYSDATE),'DD Mon YYYY HH:MI AM') AS LAST_SYNC_DATE
      FROM admins.aoms_dashboard_det
      ${ulbCondition}
    `;

    const result = await executeQuery(sql, params, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });

    const data = result.rows && result.rows.length > 0 ? result.rows[0].LAST_SYNC_DATE : null;

    res.json({ success: true, data: data });

  } catch (err) {
    console.error("Last Sync Date Fetch Error:", err);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


/**
 * Mapping from frontend card title (lowercase) → Oracle DB flag code
 * Add new entries here as the DBA confirms the correct flag codes.
 */
const FLAG_MAP = {
  "water tax":           "WAT",
  "water":               "WAT",
  "property tax":        "PT",
  "estate":              "ESTD",
  "grievances":          "GRIV",
  "cfc":                 "CFC",
  "accounts":            "ACC",
  "marriage":            "MRRG",
  "marriage registration": "MRRG",
  "birth & death":       "BAND",
  "bnd":                 "BAND",
  "fire":                "FIRE",
  "legal":               "LEGL",
  "market":              "MRKT",
  "social welfare":      "SWEL",
  "inward outward":      "INW",
  "asset management":    "ASSET",
  "works":               "WORKS",
  "rts":                 "RTS",
};

/**
 * Fetch monthwise dashboard data using aoma_dmadashboardmonthwise_fetch
 */
const fetchMonthwiseData = async (req, res) => {
  try {
    const ulbId = req.body?.ulbId || req.body?.ulbid || req.query?.ulbId || req.query?.ulbid;
    const flag = req.body?.flag || req.query?.flag;
    const userId = req.user?.userid || req.body?.userId || req.query?.userId || '1';

    // Convert human-readable flag to Oracle DB flag code
    const dbFlag = FLAG_MAP[(flag || '').toLowerCase().trim()] || flag || '';

    const params = [
      { value: normalizeUserId(userId), type: oracledb.STRING },
      { value: Number(ulbId) || 0, type: oracledb.NUMBER },
      { value: dbFlag, type: oracledb.STRING },
      { out: true, type: oracledb.NUMBER },
      { out: true, type: oracledb.STRING },
      { out: true, type: oracledb.CLOB }
    ];

    const { executeProcedure } = require('../../../db/procedureExecutor');
    const result = await executeProcedure({
      name: "admins.aoma_dmadashboardmonthwise_fetch",
      params: params
    });

    if (!result.success || !result.outBinds) {
      return res.status(500).json({ success: false, message: "Procedure execution failed" });
    }

    const errCode = result.outBinds.p4;
    const errMsg = result.outBinds.p5;
    // p6 is already a string — CLOB was read inside procedureExecutor before connection.close()
    const clobString = result.outBinds.p6 || "";

    // Oracle convention: 9999 = Success, 0 = Success, any other value = Error
    const isDbError = errCode !== null && errCode !== undefined && errCode !== 0 && errCode !== 9999;
    if (isDbError) {
      return res.status(400).json({ success: false, message: errMsg || "Error from DB" });
    }
    const fixedJson = clobString.replace(/(\s|:)\.(\d+)/g, "$10.$2");
    let parsedData = JSON.parse(fixedJson || "[]");

    // For Market, calculate Recovery Percentage
    if (dbFlag === 'MRKT' && Array.isArray(parsedData)) {
      parsedData = parsedData.map(item => {
        // Fallback to cash + cheque + online if total_collection is missing
        const demand = Number(item.total_demand || item.totalDemand || 0);
        const collection = Number(item.total_collection || item.totalCollection) || 
                           ((Number(item.cash_collection) || 0) + 
                            (Number(item.cheque_collection) || 0) + 
                            (Number(item.online_collection) || 0));
                            
        let recoveryPercentage = 0;
        if (demand > 0) {
          recoveryPercentage = (collection / demand) * 100;
        }

        return {
          ...item,
          total_collection: collection, // Ensure it's available
          total_demand: demand,         // Ensure it's available
          recovery_percentage: Number(recoveryPercentage.toFixed(2))
        };
      });
    }
    return res.json({ success: true, dbFlag: dbFlag, data: parsedData });

  } catch (error) {
    console.error("fetchMonthwiseData Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
module.exports = {
  fetchMonthwiseData,
  fetchDashboardDataNew,
  fetchLastSyncDate,
  fetchULBList,
  fetchRTSULBWiseData,
  fetchRTSULBDeptWiseData,
  fetchRTSULBServiceWiseData,
  fetchRTSStatusWiseData,
  fetchRTSApplicationDetailData,
  fetchMonthwiseData
};