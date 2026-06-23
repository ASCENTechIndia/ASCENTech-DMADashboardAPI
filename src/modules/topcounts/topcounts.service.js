const {
  repoGetTopCounts,
  repoGetApprovedCounts,
  repoGetPendingCounts,
  repoGetDelayedCounts,
  repoGetTodaysApplications,
  repoGetTodaysApproved,
} = require('./topcounts.repository');

async function serviceGetTopCounts(filters = {}) {
  return repoGetTopCounts(
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

async function serviceGetApprovedCounts(filters = {}) {
  return repoGetApprovedCounts(
    filters.ulbId,
    filters.username,
    filters.serviceId,
    filters.wardId,
    filters.fromDate,
    filters.toDate,
    filters.prabhagId,
  );
}

async function serviceGetPendingCounts(filters = {}) {
  return repoGetPendingCounts(
    filters.ulbId,
    filters.username,
    filters.serviceId,
    filters.wardId,
    filters.fromDate,
    filters.toDate
  );
}

async function serviceGetDelayedCounts(filters = {}) {
  return repoGetDelayedCounts(
    filters.ulbId,
    filters.username,
    filters.serviceId,
    filters.wardId,
    filters.fromDate,
    filters.toDate
  );
}

async function serviceGetTodaysApplications(filters = {}) {
  return repoGetTodaysApplications(
    filters.ulbId,
    filters.username,
    filters.serviceId,
    filters.wardId,filters.prabhagId
  );
}

async function serviceGetTodaysApproved(filters = {}) {
  return repoGetTodaysApproved(
    filters.ulbId,
    filters.username,
    filters.serviceId,
    filters.wardId
  );
}

module.exports = {
  serviceGetTopCounts,
  serviceGetApprovedCounts,
  serviceGetPendingCounts,
  serviceGetDelayedCounts,
  serviceGetTodaysApplications,
  serviceGetTodaysApproved,
};
