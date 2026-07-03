
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
      WITH BILL AS
(
    SELECT
        ULBID,
        SUM(BILLPRINT_BTOTALTAX + BILLPRINT_CTOTALTAX) AS TOTAL_DEMAND
    FROM admins.DMA_BILLPRINT_MAS
    GROUP BY ULBID
),
REC AS
(
    SELECT
        ULBID,
        SUM(REC_BTOTAL + REC_CTOTAL) AS TOTAL_COLLECTION
    FROM admins.DMA_REC_MAS
    GROUP BY ULBID
)
SELECT
    SUM(B.TOTAL_DEMAND) AS TOTAL_DEMAND,
    SUM(R.TOTAL_COLLECTION) AS TOTAL_COLLECTION,
    SUM(B.TOTAL_DEMAND)
    - SUM(R.TOTAL_COLLECTION) AS TOTAL_OUTSTANDING,
    ROUND(
        SUM(R.TOTAL_COLLECTION)
        * 100 /
        NULLIF(SUM(B.TOTAL_DEMAND),0),
    2) AS COLLECTION_PERCENTAGE
FROM rec P
LEFT JOIN BILL B
       ON P.ULBID = B.ULBID
LEFT JOIN REC R
       ON P.ULBID = R.ULBID`;
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
WITH BILL AS
(
    SELECT
        ULBID,
        SUM(BILLPRINT_BTOTALTAX + BILLPRINT_CTOTALTAX) AS TOTAL_DEMAND
    FROM ADMINS.DMA_BILLPRINT_MAS
    GROUP BY ULBID
),
REC AS
(
    SELECT
        ULBID,
        AMTTYPE,
        SUM(REC_BTOTAL + REC_CTOTAL) AS TOTAL_COLLECTION
    FROM ADMINS.DMA_REC_MAS
    GROUP BY ULBID, AMTTYPE
)
SELECT

    /* ========================= */
    /* MODE WISE AMOUNT */
    /* ========================= */

    SUM(
        CASE
            WHEN rm.var_recmode_paycode = 'ONL'
            THEN NVL(p.TOTAL_COLLECTION,0)
            ELSE 0
        END
    ) AS online_amount,

    SUM(
        CASE
            WHEN rm.var_recmode_paycode NOT IN ('ONL','CSH')
                 OR rm.var_recmode_paycode IS NULL
            THEN NVL(p.TOTAL_COLLECTION,0)
            ELSE 0
        END
    ) AS offline_amount,

    SUM(
        CASE
            WHEN rm.var_recmode_paycode = 'CSH'
            THEN NVL(p.TOTAL_COLLECTION,0)
            ELSE 0
        END
    ) AS cash_amount,

    /* ========================= */
    /* MODE WISE PERCENTAGE */
    /* ========================= */

    ROUND(
        CASE
            WHEN SUM(NVL(b.TOTAL_DEMAND,0)) = 0 THEN 0
            ELSE
                SUM(
                    CASE
                        WHEN rm.var_recmode_paycode = 'ONL'
                        THEN NVL(p.TOTAL_COLLECTION,0)
                        ELSE 0
                    END
                ) * 100 /
                SUM(NVL(b.TOTAL_DEMAND,0))
        END
    ,2) AS online_percentage,

    ROUND(
        CASE
            WHEN SUM(NVL(b.TOTAL_DEMAND,0)) = 0 THEN 0
            ELSE
                SUM(
                    CASE
                        WHEN rm.var_recmode_paycode NOT IN ('ONL','CSH')
                             OR rm.var_recmode_paycode IS NULL
                        THEN NVL(p.TOTAL_COLLECTION,0)
                        ELSE 0
                    END
                ) * 100 /
                SUM(NVL(b.TOTAL_DEMAND,0))
        END
    ,2) AS offline_percentage,

    ROUND(
        CASE
            WHEN SUM(NVL(b.TOTAL_DEMAND,0)) = 0 THEN 0
            ELSE
                SUM(
                    CASE
                        WHEN rm.var_recmode_paycode = 'CSH'
                        THEN NVL(p.TOTAL_COLLECTION,0)
                        ELSE 0
                    END
                ) * 100 /
                SUM(NVL(b.TOTAL_DEMAND,0))
        END
    ,2) AS cash_percentage

FROM REC p

LEFT JOIN BILL b
    ON p.ULBID = b.ULBID

LEFT JOIN prop.AOMS_RECMODE_MAS rm
    ON rm.NUM_RECMODE_ID = p.AMTTYPE`;
    const result = await executeQuery(sql, {}, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });

    if (!result.rows || result.rows.length === 0) {
      return res.json({ success: true, data: [] });
    }

  const row = result.rows[0] || {};

res.json({
  success: true,
  data: {
    ONLINE_AMOUNT: Number(row.ONLINE_AMOUNT || 0),
    OFFLINE_AMOUNT: Number(row.OFFLINE_AMOUNT || 0),
    CASH_AMOUNT: Number(row.CASH_AMOUNT || 0),
    ONLINE_PERCENTAGE: Number(row.ONLINE_PERCENTAGE || 0),
    OFFLINE_PERCENTAGE: Number(row.OFFLINE_PERCENTAGE || 0),
    CASH_PERCENTAGE: Number(row.CASH_PERCENTAGE || 0),
  },
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
      WITH BILL AS
(
    SELECT
        ULBID,
        SUM(NVL(BILLPRINT_BTOTALTAX,0)) AS BTAX,
        SUM(NVL(BILLPRINT_CTOTALTAX,0)) AS CTAX
    FROM ADMINS.DMA_BILLPRINT_MAS
    GROUP BY ULBID
),
REC AS
(
    SELECT
        ULBID,
        SUM(NVL(REC_BTOTAL,0)) AS BTOTAL,
        SUM(NVL(REC_CTOTAL,0)) AS CTOTAL
    FROM ADMINS.DMA_REC_MAS
    GROUP BY ULBID
)

SELECT
    NVL(c.VAR_CORPORATION_NAME,'TOTAL') AS Corporation,

    ROUND(SUM(NVL(B.BTAX,0)+NVL(B.CTAX,0))/10000000,2) AS Total_Demand,

    ROUND(SUM(NVL(R.BTOTAL,0)+NVL(R.CTOTAL,0))/10000000,2) AS Total_Collection,

    ROUND(
        SUM((NVL(B.BTAX,0)+NVL(B.CTAX,0))
          - (NVL(R.BTOTAL,0)+NVL(R.CTOTAL,0)))/10000000
    ,2) AS Total_Outstanding,

    ROUND(
        SUM(NVL(R.BTOTAL,0)+NVL(R.CTOTAL,0))
        *100/
        NULLIF(SUM(NVL(B.BTAX,0)+NVL(B.CTAX,0)),0)
    ,2) AS Collection_Percentage

FROM REC R
LEFT JOIN BILL B
       ON R.ULBID = B.ULBID
LEFT JOIN ADMINS.AOMA_CORPORATION_MAS C
       ON R.ULBID = C.NUM_CORPORATION_ID

GROUP BY ROLLUP(C.VAR_CORPORATION_NAME)

ORDER BY
CASE
    WHEN C.VAR_CORPORATION_NAME IS NULL THEN 1
    ELSE 0
END,
C.VAR_CORPORATION_NAME`;
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
    WITH BILL AS
(
    SELECT
        ULBID,
        SUM(BILLPRINT_BTOTALTAX) AS BTAX,
        SUM(BILLPRINT_CTOTALTAX) AS CTAX
    FROM ADMINS.DMA_BILLPRINT_MAS
    GROUP BY ULBID
),
REC AS
(
    SELECT
        ULBID,
        SUM(REC_BTOTAL) AS BTOTAL,
        SUM(REC_CTOTAL) AS CTOTAL
    FROM ADMINS.DMA_REC_MAS
    GROUP BY ULBID
)
SELECT
    corporation,
    total_demand,
    total_collection,
    total_outstanding,
    collection_percentage
FROM
(
    SELECT
        c.var_corporation_name AS corporation,

        SUM(BTAX + CTAX) AS total_demand,

        SUM(BTOTAL + CTOTAL) AS total_collection,

        SUM(BTAX + CTAX) - SUM(BTOTAL + CTOTAL) AS total_outstanding,

        ROUND(
            CASE
                WHEN SUM(BTAX + CTAX) = 0 THEN 0
                ELSE
                    SUM(BTOTAL + CTOTAL) * 100 /
                    SUM(BTAX + CTAX)
            END,
        2) AS collection_percentage

    FROM REC p

    LEFT JOIN BILL b
           ON p.ULBID = b.ULBID

    LEFT JOIN ADMINS.AOMA_CORPORATION_MAS c
           ON c.NUM_CORPORATION_ID = p.ULBID

    GROUP BY c.var_corporation_name
)
ORDER BY collection_percentage desc fetch first 5 rows only`;
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
               WITH BILL AS
(
    SELECT
        ULBID,
        SUM(BILLPRINT_BTOTALTAX) AS BTAX,
        SUM(BILLPRINT_CTOTALTAX) AS CTAX
    FROM ADMINS.DMA_BILLPRINT_MAS
    GROUP BY ULBID
),
REC AS
(
    SELECT
        ULBID,
        SUM(REC_BTOTAL) AS BTOTAL,
        SUM(REC_CTOTAL) AS CTOTAL
    FROM ADMINS.DMA_REC_MAS
    GROUP BY ULBID
)
SELECT
    corporation,
    total_demand,
    total_collection,
    total_outstanding,
    collection_percentage
FROM
(
    SELECT
        c.var_corporation_name AS corporation,

        SUM(BTAX + CTAX) AS total_demand,

        SUM(BTOTAL + CTOTAL) AS total_collection,

        SUM(BTAX + CTAX) - SUM(BTOTAL + CTOTAL) AS total_outstanding,

        ROUND(
            CASE
                WHEN SUM(BTAX + CTAX) = 0 THEN 0
                ELSE
                    SUM(BTOTAL + CTOTAL) * 100 /
                    SUM(BTAX + CTAX)
            END,
        2) AS collection_percentage

    FROM REC p

    LEFT JOIN BILL b
           ON p.ULBID = b.ULBID

    LEFT JOIN ADMINS.AOMA_CORPORATION_MAS c
           ON c.NUM_CORPORATION_ID = p.ULBID

    GROUP BY c.var_corporation_name
)
ORDER BY collection_percentage desc fetch first 5 rows only`;
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

const getTodaysCollectionRepo = async (req, res) => {
  try {
    const sql = `
        select  *  from   admins.vw_TodatyColl_Dma`;
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
    console.error("Todays Collection Fetch Error:", err);
    res.status(500).json({
      success: false,
       message: err.message
    });
  }
};

module.exports = {
  getTilesDataRepo, getModewiseCollectionRepo, getPropertySummaryRepo, getCollectioninPerctRepo,
  getTotalPerfCorpbyCollRepo, getTotalPerfCorpCollectionRepo, getTodaysCollectionRepo
};