const { getDashboardModulesRepo } = require('./Configurations.repo');

async function fetchDashboardModules(ulbId = 2) {
  return getDashboardModulesRepo(ulbId);
}

module.exports = {
  fetchDashboardModules,
};
