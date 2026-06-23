const { fetchDashboardDataNew, fetchRTSULBWiseData } = require('./DMADashboard.repo');

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

module.exports = {
  fetchDashboardData,
  fetchRTSULBWise,
};
