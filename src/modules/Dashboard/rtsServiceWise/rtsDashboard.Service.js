const {
  repoGetDepartments,
  repoGetServices,
  repoTableData,
} = require('./rtsDashboard.repo');

async function serviceGetDepartments(ulbId = 1670) {
  return repoGetDepartments(ulbId);
}

async function serviceGetServices(ulbId = 1670, deptId = null) {
  return repoGetServices(ulbId, deptId);
}


async function serviceTableData(filters = {}) {
  return repoTableData({
    ulbId: filters.ulbId || 1670,
    deptId: filters.deptId,
    serviceId: filters.serviceId,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    status: filters.status,
  });
}

module.exports = {
  serviceGetDepartments,
  serviceGetServices,
  serviceTableData,
};
