const { fetchDashboardDataNew, fetchRTSULBWiseData, fetchRTSULBDeptWiseData, fetchRTSULBServiceWiseData, fetchRTSStatusWiseData } = require('./DMADashboard.repo');

/**
 * Service to fetch dashboard data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function fetchDashboardData(req, res) {
  return await fetchDashboardDataNew(req, res);
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

module.exports = {
  fetchDashboardData,
  fetchRTSULBWise,
  fetchRTSULBDeptWise,
  fetchRTSULBServiceWise,
  fetchRTSStatusWise,
};
