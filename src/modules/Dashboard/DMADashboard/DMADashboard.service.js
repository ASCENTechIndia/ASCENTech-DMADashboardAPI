const { fetchDashboardDataNew } = require('./DMADashboard.repo');

/**
 * Service to fetch dashboard data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function fetchDashboardData(req, res) {
  return await fetchDashboardDataNew(req, res);
}

module.exports = {
  fetchDashboardData,
};
