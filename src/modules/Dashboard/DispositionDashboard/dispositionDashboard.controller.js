const { fetchDashboard } = require('./dispositionDashboard.service');
const { logApiSuccess, logApiError } = require('../../../utils/log');

async function dispositionDashboardHandler(req, res, next) {
  try {
    const payload = {
      userId: req.user?.userId || req.query.userId,
      brCategory: req.user?.brCategory || req.query.brCategory,
      query: req.query,
    };

    const data = await fetchDashboard(payload);
    logApiSuccess(req, 200, { monthYear: data.monthYear, rows: data.totalRows }, 'Disposition dashboard loaded');
    return res.ok(data);
  } catch (error) {
    logApiError(req, 500, error.message, 'Disposition dashboard error');
    return next(error);
  }
}

module.exports = {
  dispositionDashboardHandler,
};
