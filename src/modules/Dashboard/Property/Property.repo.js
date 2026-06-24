
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
const getTilesDataRepo = async (req, res) => {
  try {
 const sql = `
      SELECT 
    SUM(b.billprint_btotaltax + b.billprint_ctotaltax) AS total_demand,
    SUM(r.rec_btotal + r.rec_ctotal) AS total_collection,
    SUM(b.billprint_btotaltax + b.billprint_ctotaltax)
      - SUM(r.rec_btotal + r.rec_ctotal) AS total_outstanding,
    ROUND(
        CASE 
            WHEN SUM(b.billprint_btotaltax + b.billprint_ctotaltax) = 0 THEN 0
            ELSE 
            SUM(r.rec_btotal + r.rec_ctotal) * 100 /
             SUM(b.billprint_btotaltax + b.billprint_ctotaltax)
        END
    ,2) AS collection_percentage
FROM admins.dma_prop_mas p
LEFT JOIN admins.dma_rec_mas r
       ON p.prop_propno = r.prop_propno
       AND p.ulbid       = r.ulbid
LEFT JOIN admins.dma_billprint_mas b
       ON p.prop_propno = b.prop_propno
      AND p.ulbid       = b.ulbid`;
    const result = await executeQuery(sql, {}, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });

    if (!result.rows || result.rows.length === 0) {
      return res.json({ success: true, data: [] });
    }

  res.json({
  success: true,
  data: result.rows
});

  } catch (err) {
    console.error("Tiles Fetch Error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * Fetch RTS ULB Wise data with application status breakdown
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */

const getModewiseCollectionRepo = async (req, res) => {
  try {
    const sql = `
    SELECT
   SUM(CASE WHEN UPPER(r.rec_source) = 'ONLINE'
                 THEN (r.rec_btotal + r.rec_ctotal)
                 ELSE 0 END) AS online_amount,
  SUM(CASE WHEN UPPER(r.rec_source) = 'OFFLINE'
                 THEN (r.rec_btotal + r.rec_ctotal)
                 ELSE 0 END) AS offline_amount,
   SUM(CASE WHEN UPPER(r.rec_source) = 'CASH'
                 THEN (r.rec_btotal + r.rec_ctotal)
                 ELSE 0 END) AS cash_amount,
    ROUND(
        CASE 
            WHEN SUM(r.rec_btotal + r.rec_ctotal) = 0 THEN 0
            ELSE 
            SUM(CASE WHEN UPPER(r.rec_source)='ONLINE'
                          THEN (r.rec_btotal + r.rec_ctotal)
                          ELSE 0 END)
             * 100 /
            SUM(b.billprint_btotaltax + b.billprint_ctotaltax)
        END
    ,2) AS online_percentage,
    ROUND(
        CASE 
            WHEN SUM(r.rec_btotal + r.rec_ctotal) = 0 THEN 0
            ELSE 
            SUM(CASE WHEN UPPER(r.rec_source)='OFFLINE'
                          THEN (r.rec_btotal + r.rec_ctotal)
                          ELSE 0 END)
             * 100 /
            SUM(b.billprint_btotaltax + b.billprint_ctotaltax)
        END
    ,2) AS offline_percentage,
    ROUND(
        CASE 
            WHEN SUM(r.rec_btotal + r.rec_ctotal) = 0 THEN 0
            ELSE 
           SUM(CASE WHEN UPPER(r.rec_source)='CASH'
                          THEN (r.rec_btotal + r.rec_ctotal)
                          ELSE 0 END)
             * 100 /
            SUM(b.billprint_btotaltax + b.billprint_ctotaltax)
        END
    ,2) AS cash_percentage
FROM admins.dma_prop_mas p
LEFT JOIN admins.dma_rec_mas r
       ON p.prop_propno = r.prop_propno
      AND p.ulbid       = r.ulbid
LEFT JOIN admins.dma_billprint_mas b
       ON p.prop_propno = b.prop_propno
      AND p.ulbid       = b.ulbid`;
    const result = await executeQuery(sql, {}, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });

    if (!result.rows || result.rows.length === 0) {
      return res.json({ success: true, data: [] });
    }

  res.json({
  success: true,
  data: result.rows
});

  } catch (err) {
    console.error("Modewise Collection Fetch Error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

const getPropertySummaryRepo = async (req, res) => {
  try {
    const sql = `
  SELECT
    c.VAR_CORPORATION_NAME AS Corporation,
    COUNT(CASE WHEN UPPER(p.PROPTYPE) = 'RES'  THEN 1 END) AS Residential,
    COUNT(CASE WHEN UPPER(p.PROPTYPE) = 'NRES' THEN 1 END) AS Commercial,
    COUNT(CASE WHEN UPPER(p.PROPTYPE) = 'MIX'  THEN 1 END) AS Mixed,
    COUNT(CASE WHEN UPPER(p.PROPTYPE) IN ('RES','NRES','MIX')
               THEN 1 END) AS Total,
    ROUND(COUNT(CASE WHEN UPPER(p.PROPTYPE) = 'RES' THEN 1 END) * 100 /
        NULLIF(COUNT(CASE WHEN UPPER(p.PROPTYPE) IN ('RES','NRES','MIX')
                          THEN 1 END),0)
    ,2) AS Residential_Percentage,
    ROUND(COUNT(CASE WHEN UPPER(p.PROPTYPE) = 'NRES' THEN 1 END) * 100 /
        NULLIF(COUNT(CASE WHEN UPPER(p.PROPTYPE) IN ('RES','NRES','MIX')
      THEN 1 END),0),2) AS Commercial_Percentage,
    ROUND( COUNT(CASE WHEN UPPER(p.PROPTYPE) = 'MIX' THEN 1 END)
        * 100 /
        NULLIF(COUNT(CASE WHEN UPPER(p.PROPTYPE) IN ('RES','NRES','MIX')
                          THEN 1 END),0)
    ,2) AS Mixed_Percentage FROM admins.dma_prop_mas p
LEFT JOIN admins.aoma_corporation_mas c ON c.NUM_CORPORATION_ID = p.ULBID
GROUP BY c.VAR_CORPORATION_NAME`;
    const result = await executeQuery(sql, {}, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });

    if (!result.rows || result.rows.length === 0) {
      return res.json({ success: true, data: [] });
    }
  res.json({
  success: true,
  data: result.rows
});
  } catch (err) {
    console.error("Property Summary Fetch Error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

const getCollectioninPerctRepo = async (req, res) => {
  try {
    const sql = `
        SELECT
      TO_CHAR(c.var_corporation_name) AS corporation,
      SUM(b.billprint_btotaltax + b.billprint_ctotaltax) AS total_demand,
      SUM(r.rec_btotal + r.rec_ctotal) AS total_collection,
      SUM(b.billprint_btotaltax + b.billprint_ctotaltax)
      - SUM(r.rec_btotal + r.rec_ctotal) AS total_outstanding,
      ROUND(
      CASE 
      WHEN SUM(b.billprint_btotaltax + b.billprint_ctotaltax) = 0 THEN 0
      ELSE 
      SUM(r.rec_btotal + r.rec_ctotal) * 100 /
      SUM(b.billprint_btotaltax + b.billprint_ctotaltax)
      END
              ,2) AS collection_percentage
      FROM admins.dma_prop_mas p
      LEFT JOIN admins.dma_rec_mas r
      ON p.prop_propno = r.prop_propno
      AND p.ulbid = r.ulbid
      LEFT JOIN admins.dma_billprint_mas b
      ON p.prop_propno = b.prop_propno
      AND p.ulbid = b.ulbid
      LEFT JOIN admins.aoma_corporation_mas c
      ON c.num_corporation_id = p.ulbid
      GROUP BY c.var_corporation_name
      UNION ALL
      SELECT
      'TOTAL' AS corporation,
      SUM(b.billprint_btotaltax + b.billprint_ctotaltax) AS total_demand,
      SUM(r.rec_btotal + r.rec_ctotal) AS total_collection,
      SUM(b.billprint_btotaltax + b.billprint_ctotaltax)
      - SUM(r.rec_btotal + r.rec_ctotal) AS total_outstanding,
      ROUND(
      CASE 
      WHEN SUM(b.billprint_btotaltax + b.billprint_ctotaltax) = 0 THEN 0
      ELSE 
      SUM(r.rec_btotal + r.rec_ctotal) * 100 /
      SUM(b.billprint_btotaltax + b.billprint_ctotaltax)
      END
      ,2) AS collection_percentage
      FROM admins.dma_prop_mas p
      LEFT JOIN admins.dma_rec_mas r
      ON p.prop_propno = r.prop_propno
      AND p.ulbid = r.ulbid
      LEFT JOIN admins.dma_billprint_mas b
      ON p.prop_propno = b.prop_propno
      AND p.ulbid = b.ulbid
      LEFT JOIN admins.aoma_corporation_mas c
      ON c.num_corporation_id = p.ulbid`;
    const result = await executeQuery(sql, {}, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });

    if (!result.rows || result.rows.length === 0) {
      return res.json({ success: true, data: [] });
    }
  res.json({
  success: true,
  data: result.rows
});
  } catch (err) {
  console.error("Collection Percentage Fetch Error:", err);
  res.status(500).json({
    success: false,
    message: err.message
  });
  }
};

const getTotalPerfCorpbyCollRepo = async (req, res) => {
  try {
    const sql = `
       SELECT corporation, total_demand, total_collection, collection_percentage, rank_no
            FROM (
            SELECT
            TO_CHAR(c.var_corporation_name) AS corporation,
            SUM(b.billprint_btotaltax + b.billprint_ctotaltax) AS total_demand,
            SUM(r.rec_btotal + r.rec_ctotal) AS total_collection,
            SUM(b.billprint_btotaltax + b.billprint_ctotaltax)
            - SUM(r.rec_btotal + r.rec_ctotal) AS total_outstanding,
            ROUND(
            CASE 
            WHEN SUM(b.billprint_btotaltax + b.billprint_ctotaltax) = 0 THEN 0
            ELSE 
            SUM(r.rec_btotal + r.rec_ctotal) * 100 /
            SUM(b.billprint_btotaltax + b.billprint_ctotaltax)
            END
            ,2) AS collection_percentage,
            RANK() OVER (
            ORDER BY
            ROUND(
            CASE 
            WHEN SUM(b.billprint_btotaltax + b.billprint_ctotaltax) = 0 THEN 0
            ELSE 
            SUM(r.rec_btotal + r.rec_ctotal) * 100 /
            SUM(b.billprint_btotaltax + b.billprint_ctotaltax)
            END
            ,2
            ) DESC) rank_no
            FROM admins.dma_prop_mas p
            LEFT JOIN admins.dma_rec_mas r
            ON p.prop_propno = r.prop_propno
            AND p.ulbid = r.ulbid
            LEFT JOIN admins.dma_billprint_mas b
            ON p.prop_propno = b.prop_propno
            AND p.ulbid = b.ulbid
            LEFT JOIN admins.aoma_corporation_mas c
            ON c.num_corporation_id = p.ulbid
            GROUP BY c.var_corporation_name)
            ORDER BY rank_no`;
    const result = await executeQuery(sql, {}, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });

    if (!result.rows || result.rows.length === 0) {
      return res.json({ success: true, data: [] });
    }
res.json({
  success: true,
  data: result.rows
});
  } catch (err) {
    console.error("Total Performance Corporations by Collection Fetch Error:", err);
    res.status(500).json({
      success: false,
     message: err.message
    });
  }
};

const getTotalPerfCorpCollectionRepo = async (req, res) => {
  try {
    const sql = `
                SELECT
              corporation,
              total_demand,
              total_collection,
              collection_percentage,
              rank_no
              FROM (
              SELECT
              TO_CHAR(c.var_corporation_name) AS corporation,
              SUM(b.billprint_btotaltax + b.billprint_ctotaltax) AS total_demand,
              SUM(r.rec_btotal + r.rec_ctotal) AS total_collection,
              SUM(b.billprint_btotaltax + b.billprint_ctotaltax)
              - SUM(r.rec_btotal + r.rec_ctotal) AS total_outstanding,
              ROUND(
              CASE 
              WHEN SUM(b.billprint_btotaltax + b.billprint_ctotaltax) = 0 THEN 0
              ELSE 
              SUM(r.rec_btotal + r.rec_ctotal) * 100 /
              SUM(b.billprint_btotaltax + b.billprint_ctotaltax) END
              ,2) AS collection_percentage,
              RANK() OVER (
              ORDER BY SUM(r.rec_btotal + r.rec_ctotal) DESC
              ) AS rank_no
              FROM admins.dma_prop_mas p
              LEFT JOIN admins.dma_rec_mas r
              ON p.prop_propno = r.prop_propno
              AND p.ulbid = r.ulbid
              LEFT JOIN admins.dma_billprint_mas b
              ON p.prop_propno = b.prop_propno
              AND p.ulbid = b.ulbid
              LEFT JOIN admins.aoma_corporation_mas c
              ON c.num_corporation_id = p.ulbid
              GROUP BY c.var_corporation_name
              )
              ORDER BY rank_no`;
    const result = await executeQuery(sql, {}, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });

    if (!result.rows || result.rows.length === 0) {
      return res.json({ success: true, data: [] });
    }

res.json({
  success: true,
  data: result.rows
});

  } catch (err) {
    console.error("Tiles Fetch Error:", err);
    res.status(500).json({
      success: false,
       message: err.message
    });
  }
};

module.exports = {
  getTilesDataRepo, getModewiseCollectionRepo, getPropertySummaryRepo, getCollectioninPerctRepo,
  getTotalPerfCorpbyCollRepo, getTotalPerfCorpCollectionRepo
};