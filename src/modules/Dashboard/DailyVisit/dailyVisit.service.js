const { getDailyVisitDashboardData } = require('./dailyVisit.repo');

async function fetchDailyVisitDashboard(payload) {
  return getDailyVisitDashboardData(payload);
}

module.exports = {
  fetchDailyVisitDashboard,
};
