const { executeQuery } = require("../../db/queryExecutor");

async function repoGetTopCounts(
  ulbId,
  username,
  serviceId,
  wardId,
  fromDate,
  toDate,status,prabhagId
) {
  let sql = `
    select COUNT(appno) AS total_applications,
       SUM(approved_applications) AS approved_applications,
       SUM(pending_applications) AS pending_applications,
       SUM(CASE WHEN TRUNC(SYSDATE) - TRUNC(app_date) > NVL(num_service_maxdays, 0)
         AND TRUNC(SYSDATE) - TRUNC(app_date) > 15  AND status IN ('pending')
        THEN 1 ELSE 0 END) AS applications_greater15,
        nvl(ROUND(100 * SUM(CASE WHEN status IN ('approved')
                    AND TRUNC(SYSDATE) - TRUNC(app_date)<= NVL(num_service_maxdays,0) THEN 1 ELSE 0 END)/
        NULLIF(COUNT(CASE WHEN TRUNC(SYSDATE) - TRUNC(app_date)<= NVL(num_service_maxdays,0) THEN 1 END),
               0),2),0) AS approved_percentage
from vw_prbhagwise_applilist
inner join aorts_service_def on serviceid = num_service_serviceid
    WHERE 1=1
  `;

  const binds = {};

  if (ulbId != null) {
    sql += ` AND ulbid = :ulbId`;
    binds.ulbId = ulbId;
  }

  if (username) {
    sql += ` AND officer_name = :username`;
    binds.username = username;
  }

  if(prabhagId != null){
    sql += ` AND wardid = :prabhagId`;
    binds.prabhagId = prabhagId;
  }

  if (serviceId != null) {
    sql += ` AND serviceid = :serviceId`;
    binds.serviceId = serviceId;
  }

  if (wardId != null) {
    sql += ` AND deptid = :wardId`;
    binds.wardId = wardId;
  }

  if (fromDate) {
    sql += ` AND TRUNC(app_date) >= TO_DATE(:fromDate, 'DD-MON-YYYY')`;
    binds.fromDate = fromDate;
  }

  if (toDate) {
    sql += ` AND TRUNC(app_date) <= TO_DATE(:toDate, 'DD-MON-YYYY')`;
    binds.toDate = toDate;
  }

//   if (status) {
//    sql += `
//     AND (
//       CASE 
//         WHEN a.var_application_status IN ('NW', 'AP', 'DL') THEN 'Approved'
//         WHEN a.var_application_status IN ('CP', 'IP', 'VP', 'PP', 'PS', 'PV') THEN 'Pending'
//         WHEN a.var_application_status IN ('CR', 'DN') THEN 'Reject'
//       END
//     ) = :status
//   `;
//     binds.status = String(status);
//   }

  const result = await executeQuery(sql, binds);

  return {
    total_applications: result.rows?.[0]?.TOTAL_APPLICATIONS || 0,
  };
}

// Approved applications count
async function repoGetApprovedCounts(
  ulbId,
  username,
  serviceId,
  wardId,
  fromDate,
  toDate,prabhagId
) {
  let sql = `
     select COUNT(appno) AS total_applications,
       SUM(approved_applications) AS approved_applications,
       SUM(pending_applications) AS pending_applications,
       SUM(CASE WHEN TRUNC(SYSDATE) - TRUNC(app_date) > NVL(num_service_maxdays, 0)
         AND TRUNC(SYSDATE) - TRUNC(app_date) > 15  AND status IN ('pending')
        THEN 1 ELSE 0 END) AS applications_greater15,
        nvl(ROUND(100 * SUM(CASE WHEN status IN ('approved')
                    AND TRUNC(SYSDATE) - TRUNC(app_date)<= NVL(num_service_maxdays,0) THEN 1 ELSE 0 END)/
        NULLIF(COUNT(CASE WHEN TRUNC(SYSDATE) - TRUNC(app_date)<= NVL(num_service_maxdays,0) THEN 1 END),
               0),2),0) AS approved_percentage
from vw_prbhagwise_applilist
inner join aorts_service_def on serviceid = num_service_serviceid
    WHERE 1 = 1
  `;

  const binds = {};

  if (ulbId != null) {
    sql += ` AND ulbid = :ulbId`;
    binds.ulbId = ulbId;
  }

  if (username) {
    sql += ` AND officer_name = :username`;
    binds.username = username;
  }

  if(prabhagId != null){
    sql += ` AND wardid = :prabhagId`;
    binds.prabhagId = prabhagId;
  }

  if (serviceId != null) {
    sql += ` AND serviceid = :serviceId`;
    binds.serviceId = serviceId;
  }

  if (wardId != null) {
    sql += ` AND deptid = :wardId`;
    binds.wardId = wardId;
  }

  if (fromDate) {
    sql += ` AND TRUNC(app_date) >= TO_DATE(:fromDate, 'DD-MON-YYYY')`;
    binds.fromDate = fromDate;
  }

  if (toDate) {
    sql += ` AND TRUNC(app_date) <= TO_DATE(:toDate, 'DD-MON-YYYY')`;
    binds.toDate = toDate;
  }

  const result = await executeQuery(sql, binds);

  return {
    approved_applications: result.rows?.[0]?.APPROVED_APPLICATIONS || 0,
  };
}

// Pending applications count
async function repoGetPendingCounts(
  ulbId,
  username,
  serviceId,
  wardId,
  fromDate,
  toDate
) {
  let sql = `
    SELECT 
      COUNT(a.var_application_appno) AS pending_applications
    FROM aorts_application_det a
    INNER JOIN aorts_applicant_infodet infodet 
      ON infodet.var_appl_appno = a.var_application_appno
      AND infodet.num_appl_serviceid = a.num_application_serviceid
      AND infodet.num_appl_ulbid = a.num_application_ulbid
    INNER JOIN aorts_service_def sd
      ON sd.num_service_serviceid = a.num_application_serviceid
    LEFT JOIN aorts_service_config sc
      ON sc.num_serv_servid = sd.num_service_serviceid
      AND sc.num_serv_deptid = sd.num_service_deptid
      AND sc.num_serv_ulbid = a.num_application_ulbid
    INNER JOIN admins.aoms_dept_mas d 
      ON d.num_dept_id = a.num_application_deptid
    INNER JOIN admins.aoma_user_def u 
      ON d.num_dept_id = u.num_user_deptid
    INNER JOIN prop.vw_ward_mas w
      ON w.wardid = a.num_application_zoneid
    WHERE a.var_application_status IN ('CP', 'IP', 'VP', 'PP', 'PS', 'PV')
  `;

  const binds = {};

  if (ulbId != null) {
    sql += ` AND a.num_application_ulbid = :ulbId`;
    binds.ulbId = ulbId;
  }

  if (username) {
    sql += ` AND u.var_user_username = :username`;
    binds.username = username;
  }

  if (serviceId != null) {
    sql += ` AND sd.num_service_serviceid = :serviceId`;
    binds.serviceId = serviceId;
  }

  if (wardId != null) {
    sql += ` AND a.num_application_deptid = :wardId`;
    binds.wardId = wardId;
  }

  if (fromDate) {
    sql += ` AND TRUNC(a.dat_application_insdate) >= TO_DATE(:fromDate, 'DD-MON-YYYY')`;
    binds.fromDate = fromDate;
  }

  if (toDate) {
    sql += ` AND TRUNC(a.dat_application_insdate) <= TO_DATE(:toDate, 'DD-MON-YYYY')`;
    binds.toDate = toDate;
  }

  const result = await executeQuery(sql, binds);

  return {
    pending_applications: result.rows?.[0]?.PENDING_APPLICATIONS || 0,
  };
}

// Delayed applications count
async function repoGetDelayedCounts(
  ulbId,
  username,
  serviceId,
  wardId,
  fromDate,
  toDate
) {
  let sql = `
    SELECT 
      COUNT(a.var_application_appno) AS delayed_applications
    FROM aorts_application_det a
    INNER JOIN aorts_applicant_infodet infodet 
      ON infodet.var_appl_appno = a.var_application_appno
      AND infodet.num_appl_serviceid = a.num_application_serviceid
      AND infodet.num_appl_ulbid = a.num_application_ulbid
    INNER JOIN aorts_service_def sd
      ON sd.num_service_serviceid = a.num_application_serviceid
    LEFT JOIN aorts_service_config sc
      ON sc.num_serv_servid = sd.num_service_serviceid
      AND sc.num_serv_deptid = sd.num_service_deptid
      AND sc.num_serv_ulbid = a.num_application_ulbid
    INNER JOIN admins.aoms_dept_mas d 
      ON d.num_dept_id = a.num_application_deptid
    INNER JOIN admins.aoma_user_def u 
      ON d.num_dept_id = u.num_user_deptid
    INNER JOIN prop.vw_ward_mas w
      ON w.wardid = a.num_application_zoneid
    WHERE TRUNC(sysdate) - TRUNC(a.dat_application_insdate) > sd.num_service_maxdays
      AND a.var_application_status IN ('CP', 'IP', 'VP', 'PP', 'PS', 'PV')
  `;

  const binds = {};

  if (ulbId != null) {
    sql += ` AND a.num_application_ulbid = :ulbId`;
    binds.ulbId = ulbId;
  }

  if (username) {
    sql += ` AND u.var_user_username = :username`;
    binds.username = username;
  }

  if (serviceId != null) {
    sql += ` AND sd.num_service_serviceid = :serviceId`;
    binds.serviceId = serviceId;
  }

  if (wardId != null) {
    sql += ` AND a.num_application_deptid = :wardId`;
    binds.wardId = wardId;
  }

  if (fromDate) {
    sql += ` AND TRUNC(a.dat_application_insdate) >= TO_DATE(:fromDate, 'DD-MON-YYYY')`;
    binds.fromDate = fromDate;
  }

  if (toDate) {
    sql += ` AND TRUNC(a.dat_application_insdate) <= TO_DATE(:toDate, 'DD-MON-YYYY')`;
    binds.toDate = toDate;
  }

  const result = await executeQuery(sql, binds);

  return {
    delayed_applications: result.rows?.[0]?.DELAYED_APPLICATIONS || 0,
  };
}

async function repoGetTodaysApplications(
  ulbId,
  username,
  serviceId,
  wardId,
  prabhagId
) {
  let sql = `
    select COUNT(appno) AS total_applications,
       SUM(approved_applications) AS approved_applications,
       SUM(pending_applications) AS pending_applications,
       SUM(CASE WHEN TRUNC(SYSDATE) - TRUNC(app_date) > NVL(num_service_maxdays, 0)
         AND TRUNC(SYSDATE) - TRUNC(app_date) > 15  AND status IN ('Pending')
        THEN 1 ELSE 0 END) AS applications_greater15,
        nvl(ROUND(100 * SUM(CASE WHEN status IN ('approved')
                    AND TRUNC(SYSDATE) - TRUNC(app_date)<= NVL(num_service_maxdays,0) THEN 1 ELSE 0 END)/
        NULLIF(COUNT(CASE WHEN TRUNC(SYSDATE) - TRUNC(app_date)<= NVL(num_service_maxdays,0) THEN 1 END),
               0),2),0) AS approved_percentage
from vw_prbhagwise_applilist
inner join aorts_service_def on serviceid = num_service_serviceid
WHERE trunc(app_date)= TRUNC(sysdate)
  `;

  const binds = {};

  if (ulbId != null) {
    sql += ` AND ulbid = :ulbId`;
    binds.ulbId = ulbId;
  }

  if (prabhagId != null) {
    sql += ` AND wardid = :prabhagId`;
    binds.prabhagId = prabhagId;
  }

  if (username) {
    sql += ` AND officer_name = :username`;
    binds.username = username;
  }

  if (serviceId != null) {
    sql += ` AND serviceid = :serviceId`;
    binds.serviceId = serviceId;
  }

  if (wardId != null) {
    sql += ` AND deptid = :wardId`;
    binds.wardId = wardId;
  }

  const result = await executeQuery(sql, binds);
  return {
    todays_applications: result.rows?.[0]?.TOTAL_APPLICATIONS || 0,
    approved_applications: result.rows?.[0]?.APPROVED_APPLICATIONS || 0,    
  };
}

async function repoGetTodaysApproved(
  ulbId,
  username,
  serviceId,
  wardId
) {
  let sql = `
    SELECT 
    count(var_application_appno) todays_approved
from aorts_application_det a INNER JOIN aorts_applicant_infodet infodet  ON infodet.var_appl_appno = a.var_application_appno
   AND infodet.num_appl_serviceid = a.num_application_serviceid
   AND infodet.num_appl_ulbid = a.num_application_ulbid
INNER JOIN aorts_service_def sd
    ON sd.num_service_serviceid = a.num_application_serviceid
LEFT JOIN aorts_service_config sc
    ON sc.num_serv_servid = sd.num_service_serviceid
   AND sc.num_serv_deptid = sd.num_service_deptid
   AND sc.num_serv_ulbid = a.num_application_ulbid
INNER JOIN admins.aoms_dept_mas d ON d.num_dept_id = a.num_application_deptid
INNER JOIN admins.aoma_user_def u ON d.num_dept_id = u.num_user_deptid
inner join prop.vw_ward_mas on wardid= a.num_application_zoneid
where  a.var_application_status in ('NW','AP','DL')
  `;

  const binds = {};

  if (ulbId != null) {
    sql += ` AND a.num_application_ulbid = :ulbId`;
    binds.ulbId = ulbId;
  }

  if (username) {
    sql += ` AND u.var_user_username = :username`;
    binds.username = username;
  }

  if (serviceId != null) {
    sql += ` AND sd.num_service_serviceid = :serviceId`;
    binds.serviceId = serviceId;
  }

  if (wardId != null) {
    sql += ` AND a.num_application_deptid = :wardId`;
    binds.wardId = wardId;
  }

  const result = await executeQuery(sql, binds);
  console.log('repoGetTodaysApproved result:', result);
  return {
    todays_approved: result.rows?.[0]?.TODAYS_APPROVED || 0,
  };
}

module.exports = {
  repoGetTopCounts,
  repoGetApprovedCounts,
  repoGetPendingCounts,
  repoGetDelayedCounts,
  repoGetTodaysApplications,
  repoGetTodaysApproved,
};
