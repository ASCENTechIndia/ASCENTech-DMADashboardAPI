const { executeQuery } = require("../../db/queryExecutor");

// Counts endpoint queries
async function repoCounts(
  ulbId = 1670,
  fromDate,
  toDate,
  deptName,
  serviceName,
  wardName,
  officerName,
  status
) {
  const commonFilters = `
AND (:fromDate IS NULL OR app_date >= TO_DATE(:fromDate,'DD-MON-YYYY'))
AND (:toDate IS NULL OR app_date <= TO_DATE(:toDate,'DD-MON-YYYY'))
AND (:serviceName IS NULL OR servnm = :serviceName)
AND (:wardName IS NULL OR prabhag_nm = :wardName)
AND (:officerName IS NULL OR officer_name = :officerName)
AND (:status IS NULL OR status = :status)
`;

  const buildViewQuery = (viewName, columnName) => `
     SELECT COUNT(*) AS CNT
    FROM ${viewName}
    WHERE 1 = 1
    ${commonFilters}
  `;

  const totalAppSql = buildViewQuery(
    "vw_total_applications",
    "total_applications"
  );

  const approvedSql = buildViewQuery(
    "approved_applications",
    "approved_applications"
  );

  const pendingSql = buildViewQuery(
    "vw_pending_applications",
    "pending_applications"
  );

  const delayedSql = buildViewQuery(
    "vw_delayed_applications",
    "delayed_applications"
  );

 const approvedPercentageSql = `
  SELECT ROUND(AVG(approved_percentage), 2) AS approved_percentage
  FROM vw_withintime_perc
  WHERE 1 = 1
  ${commonFilters}
`;

  const todayAppSql = buildViewQuery(
    "vw_todays_applications",
    "todays_applications" );

  const todayApprovedSql = buildViewQuery(
    "vw_todays_approved",
    "todays_approved" );

  const binds = {
    fromDate: fromDate || null,
    toDate: toDate || null,
    serviceName: serviceName || null,
    wardName: wardName || null,
    officerName: officerName || null,
    status: status || null,
  };

 const totalAppResult = await executeQuery(totalAppSql, binds);
const approvedResult = await executeQuery(approvedSql, binds);
const pendingResult = await executeQuery(pendingSql, binds);
const delayedResult = await executeQuery(delayedSql, binds);
const approvedPercentageResult = await executeQuery(approvedPercentageSql, binds);
const todayAppResult = await executeQuery(todayAppSql, binds);
const todayApprovedResult = await executeQuery(todayApprovedSql, binds);

  return {
    total_applications: totalAppResult.rows || [],
    approved_applications: approvedResult.rows || [],
    pending_applications: pendingResult.rows || [],
    delayed_applications: delayedResult.rows || [],
    approved_percentage:approvedPercentageResult.rows?.[0]?.APPROVED_PERCENTAGE || 0,
    todays_applications:
      todayAppResult.rows?.[0]?.TODAYS_APPLICATIONS || 0,
    todays_approved:
      todayApprovedResult.rows?.[0]?.TODAYS_APPROVED || 0,
  };
}

async function repoDeptWiseApplications(
  ulbId,
  username,
  serviceId,
  wardId,
  fromDate,
  toDate,
  status,
  prabhagId
) {
  const sql = `
  select dept_marname var_dept_engname,
      COUNT(appno) AS total_applications,
      SUM(CASE WHEN status IN ('approved','Reject') THEN 1 ELSE 0 END) AS approved_applications,
      SUM(CASE WHEN status IN ('Pending') THEN 1 ELSE 0 END) AS pending_applications,
      ROUND(
        SUM(CASE WHEN status IN ('approved','Reject') THEN 1 ELSE 0 END) * 100.0 /
        NULLIF(COUNT(appno), 0),
        2
      ) AS approved_percentage
       from vw_prbhagwise_applilist
    WHERE 1 = 1
  `;

  let whereClauses = ``;
  const binds = {};

  if (ulbId != null) {
    whereClauses += ` AND ulbid = :ulbId`;
    binds.ulbId = ulbId;
  }

  if (username) {
    whereClauses += ` AND officer_name = :username`;
    binds.username = username;
  }

  if(prabhagId != null) {
    whereClauses += ` AND wardid = :prabhagId`;
    binds.prabhagId = prabhagId;
  }

  if (serviceId != null) {
    whereClauses += ` AND serviceid = :serviceId`;
    binds.serviceId = serviceId;
  }

  if (wardId != null) {
    whereClauses += ` AND deptid = :wardId`;
    binds.wardId = wardId;
  }

  if (fromDate) {
    whereClauses += ` AND TRUNC(app_date) >= TO_DATE(:fromDate, 'DD-MON-YYYY')`;
    binds.fromDate = fromDate;
  }

  if (toDate) {
    whereClauses += ` AND TRUNC(app_date) <= TO_DATE(:toDate, 'DD-MON-YYYY')`;
    binds.toDate = toDate;
  }

  if (status) {
    whereClauses += ` AND UPPER(status) = UPPER(:status)`;
    binds.status = status;
  }

  const finalSql = sql + whereClauses + `
    GROUP BY dept_marname
    ORDER BY total_applications DESC
  `;

  const result = await executeQuery(finalSql, binds);
  return result.rows || [];
}

// TAT wise pending applications
async function repoTatWisePending(
    ulbId,
  fromDate,
  toDate,
  serviceName,
  wardName,
  officerName,
  status,
  prabhagId
) {
 const sql = `
   SELECT
    CASE
        WHEN diff BETWEEN 0 AND 3 THEN '0-3 days'
        WHEN diff BETWEEN 4 AND 7 THEN '4-7 days'
        WHEN diff BETWEEN 8 AND 15 THEN '8-15 days'
        ELSE '15+ days'
    END AS days_bucket,
    COUNT(*) pending_applications
FROM
(
    SELECT
        CASE
        WHEN NVL(TRUNC(recieptdate),SYSDATE)
             - TRUNC(app_date + NVL(num_service_maxdays,0)) < 0
        THEN 0
        ELSE NVL(TRUNC(recieptdate),SYSDATE)
             - TRUNC(app_date + NVL(num_service_maxdays,0))
    END AS diff,
        appno
    FROM vw_prbhagwise_applilist a
    INNER JOIN aorts_service_def sd
        ON a.serviceid = sd.num_service_serviceid
    WHERE 1=1 and upper(status)='PENDING'
 
  `;

  let whereClauses = ``;
  const binds = {};
  if(ulbId != null) {
    whereClauses += ` AND ulbid = :ulbId`;
     binds.ulbId = ulbId;}

  if (fromDate) {
    whereClauses += ` AND TRUNC(app_date) >= TO_DATE(:fromDate, 'DD-MON-YYYY')`;
    binds.fromDate = fromDate;
  }

  if (toDate) {
    whereClauses += ` AND TRUNC(app_date) <= TO_DATE(:toDate, 'DD-MON-YYYY')`;
    binds.toDate = toDate;
  }

   if(prabhagId != null) {
    whereClauses += ` AND wardid = :prabhagId`;
    binds.prabhagId = prabhagId;
  }

  if (serviceName) {
    whereClauses += ` AND serviceid = :serviceName`;
    binds.serviceName = serviceName;
  }

  if (wardName) {
    whereClauses += ` AND deptid = :wardName`;
    binds.wardName = wardName;
  }

  if (officerName) {
    whereClauses += ` AND officer_name = :officerName`;
    binds.officerName = officerName;
  }

  // if (status) {
  //   whereClauses += ` AND UPPER(status) = UPPER(:status)`;
  //   binds.status = status;
  // }

  const finalSql = sql + whereClauses + `
  )
WHERE diff >= 0
GROUP BY
    CASE
        WHEN diff BETWEEN 0 AND 3 THEN '0-3 days'
        WHEN diff BETWEEN 4 AND 7 THEN '4-7 days'
        WHEN diff BETWEEN 8 AND 15 THEN '8-15 days'
        ELSE '15+ days'
    END
`;

  const result = await executeQuery(finalSql, binds);

  const totalPending = result.rows.reduce(
    (sum, row) => sum + Number(row.PENDING_APPLICATIONS  || 0),
    0
  );

  return {
    totalPending,
    buckets: result.rows,
  };
}

// Monthwise application trend
async function repoMonthwiseApplicationTrend(
  ulbId,
  username,
  serviceId,
  wardId,
  fromDate,
  toDate,prabhagId
) {
  const sql = `
   WITH months AS (
      SELECT ADD_MONTHS(TRUNC(SYSDATE,'MM'), -11) + INTERVAL '1' MONTH * (LEVEL - 1) AS month_start
      FROM dual
      CONNECT BY LEVEL <= 12
    )
    SELECT 
      TO_CHAR(m.month_start, 'Mon-YYYY') AS months,
      NVL(COUNT(appno), 0) AS received_applications,
      NVL(SUM(CASE WHEN status IN ('approved','Reject') THEN 1 ELSE 0 END), 0) 
      AS approved_applications
    FROM months m
    LEFT JOIN vw_prbhagwise_applilist
    ON TRUNC(app_date, 'MM') = m.month_start
    WHERE 1 = 1
  `;

  let whereClauses = ``;
  const binds = {};

  if (ulbId != null) {
    whereClauses += ` AND ulbid = :ulbId`;
    binds.ulbId = ulbId;
  }

  if (username) {
    whereClauses += ` AND officer_name = :username`;
    binds.username = username;
  }

  if (serviceId != null) {
    whereClauses += ` AND serviceid = :serviceId`;
    binds.serviceId = serviceId;
  }

  if (wardId != null) {
    whereClauses += ` AND deptid = :wardId`;
    binds.wardId = wardId;
  }

  if(prabhagId != null) {
    whereClauses += ` AND wardid = :prabhagId`;
    binds.prabhagId = prabhagId;
  }

   if (fromDate) {
    whereClauses += ` AND TRUNC(app_date) >= TO_DATE(:fromDate, 'DD-MON-YYYY')`;
    binds.fromDate = fromDate;
  }

  if (toDate) {
    whereClauses += ` AND TRUNC(app_date) <= TO_DATE(:toDate, 'DD-MON-YYYY')`;
    binds.toDate = toDate;
  }

  const finalSql = sql + whereClauses + `
    GROUP BY m.month_start
    ORDER BY m.month_start
  `;

  const result = await executeQuery(finalSql, binds);

  return result.rows || [];
}

// Application Status Summary - Approved vs Pending
async function repoApplicationStatusSummary(
  ulbId,
  fromDate,
  toDate,
  serviceName,
  wardName,
  officerName,
  status,prabhagId
) {
  const commonFilters = `
    AND (:fromDate IS NULL OR app_date >= TO_DATE(:fromDate,'DD-MON-YYYY'))
    AND (:toDate IS NULL OR app_date <= TO_DATE(:toDate,'DD-MON-YYYY'))
    AND (:serviceName IS NULL OR servnm = :serviceName)
    AND (:wardName IS NULL OR prabhag_nm = :wardName)
    AND (:officerName IS NULL OR officer_name = :officerName)
    AND (:status IS NULL OR status = :status)
  `;

  const approvedSql = `
   SELECT ROUND(
        NVL(
            SUM(
                CASE
                    WHEN status IN ('approved', 'Reject')
                     AND NVL(TRUNC(recieptdate), SYSDATE) - TRUNC(app_date) <= num_service_maxdays
                    THEN 1
                    ELSE 0
                END
            ),
            0
        ) * 100 /
        NULLIF(
            NVL(
                SUM(
                    CASE
                        WHEN status IN ('approved', 'Reject')
                        THEN 1
                        ELSE 0
                    END
                ),
                0
            ),
            0
        ),
        2
    ) AS approved_percentage
    FROM  vw_prbhagwise_applilist
    inner join aorts_service_def on serviceid = num_service_serviceid

    WHERE 1 = 1
    AND ulbid = :ulbId
     AND (:fromDate IS NULL OR TRUNC(app_date) >= TO_DATE(:fromDate,'DD-MON-YYYY'))
      AND (:toDate IS NULL OR TRUNC(app_date) <= TO_DATE(:toDate,'DD-MON-YYYY'))
      AND (:serviceName IS NULL OR serviceid = :serviceName)
      AND (:wardName IS NULL OR deptid = :wardName)
       AND (:prabhagId IS NULL OR wardid = :prabhagId)
      AND (:officerName IS NULL OR officer_name = :officerName)
      AND (:status IS NULL OR (
        CASE WHEN status IN ('approved') THEN 'Approved'
             WHEN status IN ('Pending') THEN 'Pending'
             WHEN status IN ('Reject') THEN 'Reject'
        END
      ) = :status)
 `;

  const resolvedPendingSql = `SELECT
    NVL(
        SUM(
            CASE
                WHEN status IN ('approved', 'Reject')
                 AND NVL(TRUNC(recieptdate), SYSDATE) - TRUNC(app_date) <= num_service_maxdays
                THEN 1
                ELSE 0
            END
        ),
        0
    ) AS approved_applications,

    NVL(
        SUM(
            CASE
                WHEN status IN ('approved', 'Reject')
                THEN 1
                ELSE 0
            END
        ),
        0
    )
    -
    NVL(
        SUM(
            CASE
                WHEN status IN ('approved', 'Reject')
                 AND NVL(TRUNC(recieptdate), SYSDATE) - TRUNC(app_date) <= num_service_maxdays
                THEN 1
                ELSE 0
            END
        ),
        0
    ) AS pending_applications

    FROM  vw_prbhagwise_applilist
    inner join aorts_service_def on serviceid = num_service_serviceid
    WHERE 1 = 1
    AND ulbid = :ulbId
     AND (:fromDate IS NULL OR TRUNC(app_date) >= TO_DATE(:fromDate,'DD-MON-YYYY'))
      AND (:toDate IS NULL OR TRUNC(app_date) <= TO_DATE(:toDate,'DD-MON-YYYY'))
      AND (:serviceName IS NULL OR serviceid = :serviceName)
      AND (:wardName IS NULL OR deptid = :wardName)
      AND (:prabhagId IS NULL OR wardid = :prabhagId)
      AND (:officerName IS NULL OR officer_name = :officerName)
      AND (:status IS NULL OR (
        CASE WHEN status IN ('approved') THEN 'Approved'
             WHEN status IN ('Pending') THEN 'Pending'
             WHEN status IN ('Reject') THEN 'Reject'
        END
      ) = :status)
`;

  const binds = {
    ulbId:ulbId,
    fromDate: fromDate || null,
    toDate: toDate || null,
    serviceName: serviceName || null,
    wardName: wardName || null,
    officerName: officerName || null,
    status: status || null,
    prabhagId: prabhagId || null
  };

  const [approvedResult, resolvedPendingResult] = await Promise.all([
    executeQuery(approvedSql, binds),
    executeQuery(resolvedPendingSql, binds),
  ]);

  return {
    approved_percentage:
      approvedResult.rows?.[0]?.APPROVED_PERCENTAGE || 0,

    resolved_pending: {
      approved_applications:
        resolvedPendingResult.rows?.[0]?.APPROVED_APPLICATIONS || 0,

      pending_applications:
        resolvedPendingResult.rows?.[0]?.PENDING_APPLICATIONS || 0,
    },
  };
}

// Detailed Application Status Summary
// Detailed application status - count by status
async function repoDetailedApplicationStatus(
  ulbId,
  username,
  serviceId,
  wardId,
  fromDate,
  toDate,
  status,prabhagId
) {
  const sql = `
    SELECT 
      NVL(SUM(CASE WHEN status IN ('approved') THEN 1 END), 0) AS approved_applications,
      NVL(SUM(CASE WHEN status IN ('Pending') THEN 1 END), 0) AS pending_applications,
      NVL(SUM(CASE WHEN status IN ('Reject') THEN 1 END), 0) AS reject_applications
    FROM vw_prbhagwise_applilist
 WHERE 1 = 1
  `;

  let whereClauses = ``;
  const binds = {};

  if (ulbId != null) {
    whereClauses += ` AND ulbid = :ulbId`;
    binds.ulbId = ulbId;
  }

  if (username) {
    whereClauses += ` AND officer_name = :username`;
    binds.username = username;
  }

  if (serviceId != null) {
    whereClauses += ` AND serviceid = :serviceId`;
    binds.serviceId = serviceId;
  }
  
   if(prabhagId != null) {
    whereClauses += ` AND wardid = :prabhagId`;
    binds.prabhagId = prabhagId;
  }

  if (wardId != null) {
    whereClauses += ` AND deptid = :wardId`;
    binds.wardId = wardId;
  }

  if (fromDate) {
    whereClauses += ` AND TRUNC(app_date) >= TO_DATE(:fromDate, 'DD-MON-YYYY')`;
    binds.fromDate = fromDate;
  }

  if (toDate) {
    whereClauses += ` AND TRUNC(app_date) <= TO_DATE(:toDate, 'DD-MON-YYYY')`;
    binds.toDate = toDate;
  }

 if (status) {
    whereClauses += ` AND UPPER(status) = UPPER(:status)`;
    binds.status = status;
  }

  const finalSql = sql + whereClauses;
  const result = await executeQuery(finalSql, binds);

  return result.rows?.[0] || {
    approved_applications: 0,
    pending_applications: 0,
    reject_applications: 0,
  };
}

// Top Services
async function repoTopServices(
  ulbId,
  username,
  serviceId,
  wardId,
  fromDate,
  toDate,
  status,prabhagId
) {
  const sql = `
   SELECT 
      servnm AS servnm,
      SUM(CASE WHEN status IN ('approved') THEN 1 ELSE 0 END) AS approved_applications
    FROM vw_prbhagwise_applilist
  WHERE 1 = 1
  `;

  let whereClauses = ``;
  const binds = {};

  if (ulbId != null) {
    whereClauses += ` AND ulbid = :ulbId`;
    binds.ulbId = ulbId;
  }

  if (username) {
    whereClauses += ` AND officer_name = :username`;
    binds.username = username;
  }

   if(prabhagId != null) {
    whereClauses += ` AND wardid = :prabhagId`;
    binds.prabhagId = prabhagId;
  }

  if (serviceId != null) {
    whereClauses += ` AND serviceid = :serviceId`;
    binds.serviceId = serviceId;
  }

  if (wardId != null) {
    whereClauses += ` AND deptid = :wardId`;
    binds.wardId = wardId;
  }

  if (fromDate) {
    whereClauses += ` AND TRUNC(app_date) >= TO_DATE(:fromDate, 'DD-MON-YYYY')`;
    binds.fromDate = fromDate;
  }

  if (toDate) {
    whereClauses += ` AND TRUNC(app_date) <= TO_DATE(:toDate, 'DD-MON-YYYY')`;
    binds.toDate = toDate;
  }

  if (status) {
    whereClauses += ` AND UPPER(status) = UPPER(:status)`;
    binds.status = status;
  }

  const finalSql = sql + whereClauses + `
    GROUP BY servnm
    ORDER BY approved_applications DESC
    FETCH FIRST 10 ROWS ONLY

  `;

  const result = await executeQuery(finalSql, binds);
  return result.rows || [];
}

// Service-wise Top Delay
async function repoServicewiseTopDelay(
  ulbId,
  username,
  serviceId,
  wardId,
  fromDate,
  toDate,
  status,prabhagId
) {
  const sql = `
    SELECT
      servnm AS servnm,
      SUM(CASE WHEN status IN ('Pending') AND NVL(TRUNC(recieptdate),sysdate) - TRUNC(app_date+NVL(num_service_maxdays, 0)) > 15 THEN 1 ELSE 0 END) AS pending_applications,
      ROUND(
        100 * SUM(CASE WHEN status IN ('Pending') AND NVL(TRUNC(recieptdate),sysdate) - TRUNC(app_date+NVL(num_service_maxdays, 0)) > 15 THEN 1 ELSE 0 END) /
        NULLIF(
          SUM(CASE WHEN status IN ('Pending') AND NVL(TRUNC(recieptdate),sysdate) - TRUNC(app_date+NVL(num_service_maxdays, 0)) > 15 THEN 1
                   WHEN status IN ('approved','Reject') THEN 1
                   ELSE 0 END),
          0
        ),
        2
      ) AS percentage
    FROM vw_prbhagwise_applilist
    inner join aorts_service_def on serviceid = num_service_serviceid
    WHERE 1 = 1 
  `;

  let whereClauses = ``;
  const binds = {};

  if (ulbId != null) {
    whereClauses += ` AND ulbid = :ulbId`;
    binds.ulbId = ulbId;
  }

  if (username) {
    whereClauses += ` AND officer_name = :username`;
    binds.username = username;
  }

   if(prabhagId != null) {
    whereClauses += ` AND wardid = :prabhagId`;
    binds.prabhagId = prabhagId;
  }

  if (serviceId != null) {
    whereClauses += ` AND serviceid = :serviceId`;
    binds.serviceId = serviceId;
  }

  if (wardId != null) {
    whereClauses += ` AND deptid = :wardId`;
    binds.wardId = wardId;
  }

  if (fromDate) {
    whereClauses += ` AND TRUNC(app_date) >= TO_DATE(:fromDate, 'DD-MON-YYYY')`;
    binds.fromDate = fromDate;
  }

  if (toDate) {
    whereClauses += ` AND TRUNC(app_date) <= TO_DATE(:toDate, 'DD-MON-YYYY')`;
    binds.toDate = toDate;
  }

  if (status) {
    whereClauses += ` AND UPPER(status) = UPPER(:status)`;
    binds.status = status;
  }

  const finalSql = sql + whereClauses + `
    GROUP BY servnm
    HAVING SUM(CASE WHEN status IN ('Pending') AND NVL(TRUNC(recieptdate),sysdate) - TRUNC(app_date+NVL(num_service_maxdays, 0)) > 15 THEN 1 ELSE 0 END) > 0
    ORDER BY percentage DESC
  `;

  const result = await executeQuery(finalSql, binds);
  return result.rows || [];
}

async function repoPrabhagwiseApplications(
  ulbId,
  username,
  serviceId,
  wardId,
  fromDate,
  toDate,
  status,prabhagId
) {
  const sql = `
    SELECT *
FROM
(
    SELECT
        a.prabhag_nm,
        COUNT(a.appno) AS total_applications,

        SUM(
            CASE
                WHEN a.status IN ('approved','Reject')
                THEN 1
                ELSE 0
            END
        ) AS approved_applications,

        SUM(
            CASE
                WHEN a.status = 'Pending'
                THEN 1
                ELSE 0
            END
        ) AS pending_applications,

        NVL(
    ROUND(
        100 *
        SUM(
            CASE
                WHEN status = 'approved'
                 THEN 1
                ELSE 0
            END
        )
        / NULLIF(COUNT(appno),0),
        2
    ),
    0
) AS approved_percentage,

        ROW_NUMBER() OVER
        (
            ORDER BY COUNT(a.appno) DESC
        ) AS rank

    FROM vw_prbhagwise_applilist a
    INNER JOIN aorts_service_def sd
        ON sd.num_service_serviceid = a.serviceid
      WHERE 1 = 1
  `;

  let whereClauses = ``;
  const binds = {};

  if (ulbId != null) {
    whereClauses += ` AND a.ulbid = :ulbId`;
    binds.ulbId = ulbId;
  }

   if(prabhagId != null) {
    whereClauses += ` AND a.wardid = :prabhagId`;
    binds.prabhagId = prabhagId;
  }

  if (username) {
    whereClauses += ` AND a.officer_name = :username`;
    binds.username = username;
  }

  if (serviceId != null) {
    whereClauses += ` AND a.serviceid = :serviceId`;
    binds.serviceId = serviceId;
  }

  if (wardId != null) {
    whereClauses += ` AND a.deptid = :wardId`;
    binds.wardId = wardId;
  }

  if (fromDate) {
    whereClauses += ` AND TRUNC(a.app_date) >= TO_DATE(:fromDate, 'DD-MON-YYYY')`;
    binds.fromDate = fromDate;
  }

  if (toDate) {
    whereClauses += ` AND TRUNC(a.app_date) <= TO_DATE(:toDate, 'DD-MON-YYYY')`;
    binds.toDate = toDate;
  }

  if (status) {
    whereClauses += ` AND UPPER(a.status) = UPPER(:status)`;
    binds.status = status;
  }

  const finalSql = sql + whereClauses + `
      GROUP BY a.prabhag_nm
    )
    WHERE rank <= 10
  `;

  const result = await executeQuery(finalSql, binds);
  return result.rows || [];
}

async function repoCommissionerSummary(
  ulbId,
  username,
  serviceId,
  wardId,
  fromDate,
  toDate,
  status,prabhagId
) {
  const sql = `
    select COUNT(appno) AS total_applications,
       SUM(
            CASE
                WHEN status IN ('approved','Reject')
                THEN 1
                ELSE 0
            END
        ) AS approved_applications,
       SUM(pending_applications) AS pending_applications,SUM(CASE when nvl(TRUNC(recieptdate),sysdate) - TRUNC(app_date + NVL(num_service_maxdays,0))> 15 
           AND status IN ('Pending')
        THEN 1 ELSE 0 END) AS applications_greater15,
        ROUND(
        NVL(
            SUM(
                CASE
                    WHEN status IN ('approved', 'Reject')
                     AND NVL(TRUNC(recieptdate), SYSDATE) - TRUNC(app_date) <= num_service_maxdays
                    THEN 1
                    ELSE 0
                END
            ),
            0
        ) * 100 /
        NULLIF(
            NVL(
                SUM(
                    CASE
                        WHEN status IN ('approved', 'Reject')
                        THEN 1
                        ELSE 0
                    END
                ),
                0
            ),
            0
        ),
        2
    ) AS approved_percentage
from vw_prbhagwise_applilist
inner join aorts_service_def on serviceid = num_service_serviceid
    WHERE 1 = 1
  `;

  let whereClauses = ``;
  const binds = {};

  if (ulbId != null) {
    whereClauses += ` AND ulbid = :ulbId`;
    binds.ulbId = ulbId;
  }

  if (username) {
    whereClauses += ` AND officer_name = :username`;
    binds.username = username;
  }

   if(prabhagId != null) {
    whereClauses += ` AND wardid = :prabhagId`;
    binds.prabhagId = prabhagId;
  }

  if (serviceId != null) {
    whereClauses += ` AND serviceid = :serviceId`;
    binds.serviceId = serviceId;
  }

  if (wardId != null) {
    whereClauses += ` AND deptid = :wardId`;
    binds.wardId = wardId;
  }

  if (fromDate) {
    whereClauses += ` AND TRUNC(app_date) >= TO_DATE(:fromDate, 'DD-MON-YYYY')`;
    binds.fromDate = fromDate;
  }

  if (toDate) {
    whereClauses += ` AND TRUNC(app_date) <= TO_DATE(:toDate, 'DD-MON-YYYY')`;
    binds.toDate = toDate;
  }

 if (status) {
    whereClauses += ` AND UPPER(status) = UPPER(:status)`;
    binds.status = status;
  }
  const finalSql = sql + whereClauses;

  const result = await executeQuery(finalSql, binds);
  return result.rows || [];
}

async function repoAlerts(
  ulbId,
  username,
  serviceId,
  wardId,
  fromDate,
  toDate,
  status,prabhagId
) {
  const baseSql = `
    SELECT *
FROM
(
    WITH bucket_data AS
(
    SELECT
        CASE
            WHEN overdue_days BETWEEN 4 AND 15 THEN '4-15 days'
            WHEN overdue_days > 15 THEN '15+ days'
        END AS days_bucket,
        COUNT(*) applications_count
    FROM
    (
        SELECT
            NVL(TRUNC(recieptdate),SYSDATE)
            - TRUNC(app_date + NVL(num_service_maxdays,0)) AS overdue_days
        FROM vw_prbhagwise_applilist a
        INNER JOIN aorts_service_def sd
            ON a.serviceid = sd.num_service_serviceid
    WHERE a.status = 'Pending'
          AND a.ulbid = :ulbId
          AND NVL(TRUNC(recieptdate),sysdate) - TRUNC(app_date + NVL(num_service_maxdays,0)) >= 4
  `;

  let whereClauses = ``;
  const binds = { ulbId };

  if (username) {
    whereClauses += ` AND a.officer_name = :username`;
    binds.username = username;
  }

  if (serviceId != null) {
    whereClauses += ` AND a.serviceid = :serviceId`;
    binds.serviceId = serviceId;
  }

   if(prabhagId != null) {
    whereClauses += ` AND wardid = :prabhagId`;
    binds.prabhagId = prabhagId;
  }

  if (wardId != null) {
    whereClauses += ` AND a.deptid = :wardId`;
    binds.wardId = wardId;
  }

  if (fromDate) {
    whereClauses += ` AND TRUNC(a.app_date) >= TO_DATE(:fromDate, 'DD-MON-YYYY')`;
    binds.fromDate = fromDate;
  }

  if (toDate) {
    whereClauses += ` AND TRUNC(a.app_date) <= TO_DATE(:toDate, 'DD-MON-YYYY')`;
    binds.toDate = toDate;
  }

   // if (status) {
  //   whereClauses += ` AND UPPER(status) = UPPER(:status)`;
  //   binds.status = status;
  // }

  const pendingSql = baseSql + whereClauses + `
            )
    WHERE overdue_days >= 4
    GROUP BY
        CASE
            WHEN overdue_days BETWEEN 4 AND 15 THEN '4-15 days'
            WHEN overdue_days > 15 THEN '15+ days'
        END
)
SELECT
    b.days_bucket,
    NVL(d.applications_count,0) AS applications_count
FROM
(
    SELECT '15+ days' days_bucket FROM dual
    UNION ALL
    SELECT '4-15 days' FROM dual
) b
LEFT JOIN bucket_data d
    ON b.days_bucket = d.days_bucket
    
    UNION ALL

    SELECT
        'OnTimeDelivered' AS days_bucket,
        COUNT(appno) AS applications_count
    FROM vw_prbhagwise_applilist a
    INNER JOIN aorts_service_def sd
        ON a.serviceid = sd.num_service_serviceid
    WHERE a.status IN ('approved','Reject')
  AND a.ulbid = :ulbId
  ` + whereClauses + `
          AND NVL(TRUNC(recieptdate),SYSDATE) - TRUNC(app_date)
            <= NVL(num_service_maxdays,0)
)
ORDER BY
    CASE
        WHEN days_bucket = '15+ days' THEN 1
        WHEN days_bucket = '4-15 days' THEN 2
        WHEN days_bucket = 'OnTimeDelivered' THEN 3
    END
  `;

  const result = await executeQuery(pendingSql, binds);
  
  let pendingBuckets = [];
  let approvedApplications = 0;
  
  if (result.rows) {
    pendingBuckets = result.rows.filter(row => row.DAYS_BUCKET !== 'OnTimeDelivered');
    const onTimeRow = result.rows.find(row => row.DAYS_BUCKET === 'OnTimeDelivered');
    approvedApplications = onTimeRow ? (onTimeRow.APPLICATIONS_COUNT || 0) : 0;
  }
  
  return {
    pendingBuckets: pendingBuckets,
    approvedApplications: approvedApplications,
  };
}

async function repoComplaintStatus(ulbId=1670) {
  const sql = `SELECT COUNT (id) AS total_complaints,
       COUNT (CASE WHEN hearingstat IN ('A', 'R') THEN 1 END) AS resolved_complaints,
       COUNT (CASE WHEN hearingstat is null or  hearingstat = 'P' THEN 1 END) AS pending_complaints,
       ROUND (
             COUNT (CASE WHEN hearingstat IN ('A', 'R') THEN 1 END)
           * 100
           / NULLIF (COUNT (id), 0),
           2)
           AS resolved_percentage
  FROM view_appealdtls WHERE 1=1 AND ulbid = :ulbId
`;
  const result = await executeQuery(sql, { ulbId });
  return result.rows || [];
}

async function repoRTSComplaints(ulbId=1670) {
  const sql = `SELECT COUNT (id) AS RTS_complaints FROM view_appealdtls WHERE 1=1 AND ulbid = :ulbId`;
  const result = await executeQuery(sql, { ulbId });
  return result.rows || [];
}

async function repoOfficerWork(
  ulbId,
  username,
  serviceId,
  wardId,
  fromDate,
  toDate,
  status,prabhagId
) {
  let sql = `
    SELECT *
    FROM (
      SELECT
        a.officer_name,
        COUNT(a.appno) AS total_applications,

        SUM(
          CASE
            WHEN a.status IN ('approved','Reject')
            THEN 1
            ELSE 0
          END
        ) AS approved_applications,

        SUM(
          CASE
            WHEN a.status = 'Pending'
            THEN 1
            ELSE 0
          END
        ) AS pending_applications,

        NVL(
          ROUND(
            100 *
            SUM(
              CASE
                WHEN a.status = 'approved'
                THEN 1
                ELSE 0
              END
            )
            / NULLIF(COUNT(a.appno), 0),
            2
          ),
          0
        ) AS approved_percentage,

        ROW_NUMBER() OVER (
          ORDER BY COUNT(a.appno) DESC
        ) AS rank,

        SUM(
          CASE
            WHEN TRUNC(SYSDATE) - TRUNC(a.app_date) >
                 NVL(sd.num_service_maxdays, 0)
             AND a.status = 'Pending'
            THEN 1
            ELSE 0
          END
        ) AS delayed_app

      FROM vw_prbhagwise_applilist a
      INNER JOIN aorts_service_def sd
        ON sd.num_service_serviceid = a.serviceid

      WHERE 1 = 1
  `;

  const binds = {};

  if (ulbId != null) {
    sql += ` AND a.ulbid = :ulbId`;
    binds.ulbId = ulbId;
  }

  if (username) {
    sql += ` AND a.officer_name = :username`;
    binds.username = username;
  }

  if (serviceId != null) {
    sql += ` AND a.serviceid = :serviceId`;
    binds.serviceId = serviceId;
  }

   if(prabhagId != null) {
    sql += ` AND a.wardid = :prabhagId`;
    binds.prabhagId = prabhagId;
  }

  if (wardId != null) {
    sql += ` AND a.deptid = :wardId`;
    binds.wardId = wardId;
  }

  if (fromDate) {
    sql += `
      AND TRUNC(a.app_date) >=
          TO_DATE(:fromDate, 'DD-MON-YYYY')
    `;
    binds.fromDate = fromDate;
  }

  if (toDate) {
    sql += `
      AND TRUNC(a.app_date) <=
          TO_DATE(:toDate, 'DD-MON-YYYY')
    `;
    binds.toDate = toDate;
  }

   if (status) {
    sql += ` AND UPPER(status) = UPPER(:status)`;
    binds.status = status;
  }

  sql += `
      GROUP BY a.officer_name
    )
    WHERE rank <= 10
    ORDER BY rank
  `;

  const result = await executeQuery(sql, binds);

  return result.rows || [];
}

module.exports = {
  repoCounts,
  repoDeptWiseApplications,
  repoTatWisePending,
  repoMonthwiseApplicationTrend,
  repoApplicationStatusSummary,
  repoDetailedApplicationStatus,
  repoTopServices,
  repoServicewiseTopDelay,
  repoPrabhagwiseApplications,
  repoCommissionerSummary,
  repoAlerts,
  repoComplaintStatus,
  repoRTSComplaints,
  repoOfficerWork,
};
