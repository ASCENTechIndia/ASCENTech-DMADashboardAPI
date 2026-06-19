const { getDashboardData } = require('./activeAgents.repo');

async function fetchDashboard(payload) {
  return getDashboardData(payload);
}

module.exports = {
  fetchDashboard,
};
