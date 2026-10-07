const { executeQuery } = require('../../../db/queryExecutor');

async function repoGetDepartments(ulbId = 1670) {
  const sql = `
    SELECT DISTINCT 
      deptid AS deptId, 
      dept_marname AS deptName
    FROM prop.vw_deptconfig
    INNER JOIN aorts_service_def 
      ON num_service_deptid = deptid AND var_service_active = 'Y'
    INNER JOIN aorts_service_config 
      ON num_serv_ulbid = ulbid AND num_serv_servid = num_service_serviceid
    WHERE ulbid = :ulbId
    ORDER BY dept_marname ASC
  `;

  let result = await executeQuery(sql, { ulbId: Number(ulbId) });

  if ((!result.rows || result.rows.length === 0) && Number(ulbId) === 1670) {
    result = await executeQuery(sql, { ulbId: 4 });
  }

  return (result.rows || []).map((row) => ({
    deptId: row.DEPTID,
    deptName: row.DEPTNAME,
  }));
}

async function repoGetServices(ulbId = 1670, deptId = null) {
  const sql = `
    SELECT 
      num_service_serviceid AS serviceId,
      CASE 
        WHEN var_serv_dispname IS NULL THEN var_service_mar_name 
        ELSE var_serv_dispname 
      END AS serviceName,
      num_service_deptid AS deptId
    FROM aorts_service_def 
    INNER JOIN aorts_service_config 
      ON num_serv_servid = num_service_serviceid
    WHERE var_service_active = 'Y' 
      AND num_serv_ulbid = :ulbId
      AND (:deptId IS NULL OR num_service_deptid = :deptId)
    ORDER BY serviceName ASC
  `;

  const binds = {
    ulbId: Number(ulbId),
    deptId: deptId != null ? Number(deptId) : null,
  };

  let result = await executeQuery(sql, binds);

  if ((!result.rows || result.rows.length === 0) && Number(ulbId) === 1670) {
    result = await executeQuery(sql, { ...binds, ulbId: 4 });
  }

  return (result.rows || []).map((row) => ({
    serviceId: row.SERVICEID,
    serviceName: row.SERVICENAME,
    deptId: row.DEPTID,
  }));
}


function getFinancialYearStart() {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `01-APR-${year}`;
}

async function repoTableData({
  ulbId = 1670,
  deptId = null,
  serviceId = null,
  fromDate = null,
  toDate = null,
  status = null,
} = {}) {

  const effectiveFromDate = fromDate || getFinancialYearStart();

  let sql = `
    SELECT 
      deptid AS deptId,
      dept_marname AS vibhagName,
      serviceid AS serviceId,
      servnm AS serviceName,
      COUNT(appno) AS totalApplications,
      SUM(CASE WHEN UPPER(status) IN ('APPROVED', 'REJECT') THEN 1 ELSE 0 END) AS approvedApplications,
      SUM(CASE WHEN UPPER(status) = 'PENDING' THEN 1 ELSE 0 END) AS pendingApplications,
      0 AS vilambitApplications
    FROM vw_prbhagwise_applilist
    WHERE 1 = 1
  `;

  const binds = {};

  if (ulbId != null) {
    sql += ` AND ulbid = :ulbId`;
    binds.ulbId = Number(ulbId);
  }

  if (deptId != null) {
    sql += ` AND deptid = :deptId`;
    binds.deptId = Number(deptId);
  }

  if (serviceId != null) {
    sql += ` AND serviceid = :serviceId`;
    binds.serviceId = Number(serviceId);
  }

  sql += ` AND TRUNC(app_date) >= TO_DATE(:fromDate, 'DD-MON-YYYY')`;
  binds.fromDate = effectiveFromDate;

  if (toDate) {
    sql += ` AND TRUNC(app_date) <= TO_DATE(:toDate, 'DD-MON-YYYY')`;
    binds.toDate = toDate;
  }

  if (status) {
    sql += ` AND UPPER(status) = UPPER(:status)`;
    binds.status = status;
  }

  sql += `
    GROUP BY deptid, dept_marname, serviceid, servnm
    ORDER BY dept_marname ASC, servnm ASC
  `;

  let result = await executeQuery(sql, binds);

  if ((!result.rows || result.rows.length === 0) && Number(ulbId) === 1670) {
    result = await executeQuery(sql, { ...binds, ulbId: 4 });
  }

  const rows = result.rows || [];

  let totalPrapt = 0;
  let totalNikali = 0;
  let totalPrambhit = 0;
  let totalVilambit = 0;

  const tableData = rows.map((row) => {
    const prapt = Number(row.TOTALAPPLICATIONS || 0);
    const nikali = Number(row.APPROVEDAPPLICATIONS || 0);
    const prambhit = Number(row.PENDINGAPPLICATIONS || 0);
    const vilambit = Number(row.VILAMBITAPPLICATIONS || 0);

    totalPrapt += prapt;
    totalNikali += nikali;
    totalPrambhit += prambhit;
    totalVilambit += vilambit;

    return {
      deptId: row.DEPTID,
      vibhagName: row.VIBHAGNAME,
      serviceId: row.SERVICEID,
      serviceName: row.SERVICENAME,
      prapt,
      nikali,
      prambhit,
      vilambit,
    };
  });

  const nikaliDar = totalPrapt > 0
    ? Number(((totalNikali * 100) / totalPrapt).toFixed(2))
    : 0;

  const summary = {
    totalPrapt,
    totalNikali,
    totalPrambhit,
    totalVilambit,
    nikaliDar,
  };

  return {
    summary,
    tableData,
  };
}

module.exports = {
  repoGetDepartments,
  repoGetServices,
  repoTableData,
};
