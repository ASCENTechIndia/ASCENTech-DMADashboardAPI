
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

module.exports = {
  fetchDashboardDataNew
};