const { fetchDashboard } = require('./activeAgents.service');
const { logApiSuccess, logApiError } = require('../../../utils/log');

async function activeAgentsDashboardHandler(req, res, next) {
  try {
    const payload = {
      userId: req.user?.userId || req.query.userId,
      month: req.query.month,
      year: req.query.year,
    };

    const data = await fetchDashboard(payload);
    logApiSuccess(req, 200, { month: data.month, year: data.year }, 'Active agents dashboard loaded');
    return res.ok(data);
  } catch (error) {
    logApiError(req, 500, error.message, 'Active agents dashboard error');
    return next(error);
  }
}

module.exports = {
  activeAgentsDashboardHandler,
};
