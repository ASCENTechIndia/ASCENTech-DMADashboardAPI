const { fetchDashboardModules } = require('./Configurations.service');
const { logApiSuccess, logApiError } = require('../../../utils/log');

async function getDashboardModules(req, res, next) {
  try {
    const data = await fetchDashboardModules(req.query.ulbId);
    logApiSuccess(req, 200, { count: data.length }, 'Dashboard modules fetched');
    return res.json({ success: true, data });
  } catch (error) {
    logApiError(req, 500, error.message, 'Dashboard modules fetch error');
    return next(error);
  }
}

module.exports = {
  getDashboardModules,
};
