
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
    // const { ulbId } = req.body;
    // if (!ulbId) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "ulbId is required"
    //   });
    // }

    const sql = `
      SELECT JSON_ARRAYAGG(
         JSON_OBJECT(
           'code' VALUE x.var_dasdboard_modulecode,
           'title' VALUE x.var_module_title,
           'colorcode' VALUE x.colorcode,
           'metrics' VALUE JSON_ARRAY(
               JSON_OBJECT(
                   'label' VALUE x.column1_label,
                   'value' VALUE x.total_column1
                   RETURNING CLOB
               ),
               JSON_OBJECT(
                   'label' VALUE x.column2_label,
                   'value' VALUE x.total_column2
                   RETURNING CLOB
               ),
               JSON_OBJECT(
                   'label' VALUE x.column3_label,
                   'value' VALUE x.total_column3
                   RETURNING CLOB
               )
               RETURNING CLOB
           )
           RETURNING CLOB
         )
         ORDER BY x.num_seqno
         RETURNING CLOB
       ) AS dashboard_json
FROM
(
    SELECT
        d.var_dasdboard_modulecode,
        m.var_module_title,
        m.num_seqno,

        SUM(NVL(d.num_dasdboard_column1,0)) AS total_column1,
        SUM(NVL(d.num_dasdboard_column2,0)) AS total_column2,
        SUM(NVL(d.num_dasdboard_column3,0)) AS total_column3,

        MAX(c1.var_column_label) AS column1_label,
        MAX(c2.var_column_label) AS column2_label,
        MAX(c3.var_column_label) AS column3_label,

        CASE
            WHEN MAX(SYSDATE - d.dat_dasdboard_transdt) <= 30
                 THEN 'GREEN'
            WHEN MAX(SYSDATE - d.dat_dasdboard_transdt) > 30
                 THEN 'YELLOW'
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
      -- AND d.num_dashboard_ulbid = 890

    GROUP BY
        d.var_dasdboard_modulecode,
        m.var_module_title,
        m.num_seqno
) x   `;

    const result = await executeQuery(sql, {}, {
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

    res.json({ success: true, data: parsedJSON });

  } catch (err) {
    console.error("Dashboard Fetch Error:", err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error"
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
                WHERE ulbid NOT IN (550, 1))
      SELECT var_corporation_shortname, num_corporation_id, SUM (new) new,
             SUM (approved) approved,
             SUM (verification_pending) verification_pending,
             SUM (in_process) process, SUM (denied) denied, SUM (deliverd) deliverd,
             SUM (authorisation_pending) authorisation_pending,
             SUM (authorisation_reject) authorisation_reject,
             SUM (payment_pending) payment_pending, SUM (total) total
        FROM dashbord
             INNER JOIN admins.aoma_corporation_mas ON num_corporation_id = ulbid
      GROUP BY var_corporation_shortname, num_corporation_id, var_corporation_name
      ORDER BY var_corporation_name
    `;

    const result = await executeQuery(sql, {}, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });

    const data = result.rows || [];

    res.json({ success: true, data: data });

  } catch (err) {
    console.error("RTS ULB Wise Fetch Error:", err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error"
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
        from aorts.vw_dashborddata  where ulbid not in ( 550,1) 
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
      message: "Internal Server Error"
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
        from aorts.vw_dashborddata  where ulbid not in ( 550,1) 
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
      message: "Internal Server Error"
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
        from aorts.vw_dashborddata  where ulbid not in ( 550,1) 
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
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  fetchDashboardDataNew,
  fetchRTSULBWiseData,
  fetchRTSULBDeptWiseData,
  fetchRTSULBServiceWiseData,
  fetchRTSStatusWiseData
};