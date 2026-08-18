const { fetchDashboardDataNew, fetchLastSyncDate, fetchULBList, fetchRTSULBWiseData, fetchRTSULBDeptWiseData, fetchRTSULBServiceWiseData, fetchRTSStatusWiseData, fetchRTSApplicationDetailData } = require('./DMADashboard.repo');

/**
 * Service to fetch dashboard data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function fetchDashboardData(req, res) {
  return await fetchDashboardDataNew(req, res);
}

/**
 * Service to fetch ULB (Corporation) list
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function fetchULBListData(req, res) {
  return await fetchULBList(req, res);
}

/**
 * Service to fetch RTS ULB Wise data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function fetchRTSULBWise(req, res) {
  return await fetchRTSULBWiseData(req, res);
}

/**
 * Service to fetch RTS ULB Department Wise data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function fetchRTSULBDeptWise(req, res) {
  return await fetchRTSULBDeptWiseData(req, res);
}

/**
 * Service to fetch RTS ULB Service Wise data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function fetchRTSULBServiceWise(req, res) {
  return await fetchRTSULBServiceWiseData(req, res);
}

/**
 * Service to fetch RTS Status Wise data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function fetchRTSStatusWise(req, res) {
  return await fetchRTSStatusWiseData(req, res);
}

/**
 * Service to fetch RTS Application Detail data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function fetchRTSApplicationDetail(req, res) {
  return await fetchRTSApplicationDetailData(req, res);
}

/**
 * Service to fetch Last Sync Date
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function fetchLastSyncDateData(req, res) {
  return await fetchLastSyncDate(req, res);
}

module.exports = {
  fetchDashboardData,
  fetchLastSyncDateData,
  fetchULBListData,
  fetchRTSULBWise,
  fetchRTSULBDeptWise,
  fetchRTSULBServiceWise,
  fetchRTSServiceWise: fetchRTSULBServiceWise, // For backward compatibility if needed
  fetchRTSStatusWise,
  fetchRTSApplicationDetail,
};
