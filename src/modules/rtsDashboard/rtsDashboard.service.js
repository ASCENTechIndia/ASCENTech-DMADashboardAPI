const {
  repoCounts,
  repoDeptWiseApplications,
  repoTatWisePending,
  repoMonthwiseApplicationTrend,
  repoApplicationStatusSummary,
  repoDetailedApplicationStatus,
  repoTopServices,
  repoServicewiseTopDelay, repoPrabhagwiseApplications, repoCommissionerSummary, repoAlerts,
  repoComplaintStatus, repoRTSComplaints, repoOfficerWork
} = require('./rtsDashboard.repository');

async function serviceCounts(ulbId, filters = {}) {
  return repoCounts(
    ulbId,
    filters.fromDate,
    filters.toDate,
    filters.deptName,
    filters.serviceName,
    filters.wardName,
    filters.officerName,
    filters.status
  );
}

async function serviceDeptWiseApplications(filters = {}) {
  return repoDeptWiseApplications(
    filters.ulbId,
    filters.username,
    filters.serviceId,
    filters.wardId,
    filters.fromDate,
    filters.toDate,
    filters.status,
    filters.prabhagId
  );
}

async function serviceTatWisePending( filters = {}) {
  return repoTatWisePending( 
    filters.ulbId,
    filters.fromDate,
    filters.toDate,
    filters.serviceName,
    filters.wardName,
    filters.officerName,
    filters.status,
    filters.prabhagId
  );
}

async function serviceMonthwiseApplicationTrend(filters = {}) {
  return repoMonthwiseApplicationTrend(
    filters.ulbId,
    filters.username,
    filters.serviceId,
    filters.wardId,
    filters.fromDate,
    filters.toDate,
    filters.prabhagId
  );
}

async function serviceApplicationStatusSummary(filters = {}) {
  return repoApplicationStatusSummary(
    filters.ulbId,
    filters.fromDate,
    filters.toDate,
    filters.serviceName,
    filters.wardName,
    filters.officerName,
    filters.status,
    filters.prabhagId
  );
}

async function serviceDetailedApplicationStatus(filters = {}) {
  return repoDetailedApplicationStatus(
    filters.ulbId,
    filters.username,
    filters.serviceId,
    filters.wardId,
    filters.fromDate,
    filters.toDate,
    filters.status,
    filters.prabhagId
  );
}

async function serviceTopServices(filters = {}) {
  return repoTopServices(
    filters.ulbId,
    filters.username,
    filters.serviceId,
    filters.wardId,
    filters.fromDate,
    filters.toDate,
    filters.status,
    filters.prabhagId
  );
}

async function serviceServicewiseTopDelay(filters = {}) {
  return repoServicewiseTopDelay(
    filters.ulbId,
    filters.username,
    filters.serviceId,
    filters.wardId,
    filters.fromDate,
    filters.toDate,
    filters.status,
    filters.prabhagId
  );
}

async function servicePrabhagwiseApplications(filters = {}) {
  return repoPrabhagwiseApplications(
    filters.ulbId,
    filters.username,
    filters.serviceId,
    filters.wardId,
    filters.fromDate,
    filters.toDate,
    filters.status,
    filters.prabhagId
  );
}

async function serviceCommissionerSummary(filters = {}) {
  return repoCommissionerSummary(
    filters.ulbId,
    filters.username,
    filters.serviceId,
    filters.wardId,
    filters.fromDate,
    filters.toDate,
    filters.status,
    filters.prabhagId
  );
}

async function serviceAlerts(ulbId, username, serviceId, wardId, fromDate, toDate, status, prabhagId){
  return repoAlerts(ulbId, username, serviceId, wardId, fromDate, toDate, status, prabhagId);
}

async function serviceComplaintStatus(ulbId){
  return repoComplaintStatus(ulbId);
}

async function serviceRTSComplaints(ulbId){
  return repoRTSComplaints(ulbId);
}

async function serviceOfficerWork(filters = {}){
  return repoOfficerWork(
    filters.ulbId,
    filters.username,
    filters.serviceId,
    filters.wardId,
    filters.fromDate,
    filters.toDate,
    filters.status,
    filters.prabhagId
  );
}

module.exports = {
  serviceCounts,
  serviceDeptWiseApplications,
  serviceTatWisePending,
  serviceMonthwiseApplicationTrend,
  serviceApplicationStatusSummary,
  serviceDetailedApplicationStatus,
  serviceTopServices,
  serviceServicewiseTopDelay,
  servicePrabhagwiseApplications, serviceCommissionerSummary, serviceAlerts,
  serviceComplaintStatus, serviceRTSComplaints, serviceOfficerWork
};
