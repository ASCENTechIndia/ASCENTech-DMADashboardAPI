const { fetchDailyVisitDashboard } = require('./dailyVisit.service');
const { logApiSuccess, logApiError } = require('../../../utils/log');

async function dailyVisitDashboardHandler(req, res, next) {
  try {
    const payload = {
      userId: req.user?.userId || req.query.userId,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
    };

    const data = await fetchDailyVisitDashboard(payload);
    logApiSuccess(
      req,
      200,
      {
        userId: data?.userContext?.userId,
        fromDate: data?.dateRange?.fromDate,
        toDate: data?.dateRange?.toDate,
      },
      'Daily Visit dashboard loaded'
    );

    return res.ok(data);
  } catch (error) {
    const status = error?.statusCode || 500;
    if (status < 500) {
      return res.fail(error.message, status);
    }

    logApiError(req, 500, error.message, 'Daily Visit dashboard error');
    return next(error);
  }
}

module.exports = {
  dailyVisitDashboardHandler,
};
