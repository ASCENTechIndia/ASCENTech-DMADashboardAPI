const { getDashboardData } = require('./dispositionDashboard.repo');

async function fetchDashboard(payload) {
  return getDashboardData(payload);
}

module.exports = {
  fetchDashboard,
};
