const { fetchDashboardData } = require('./DMADashboard.service');
const { logApiSuccess, logApiError } = require('../../../utils/log');

/**
 * Controller handler for fetching DMA Dashboard data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
async function dmaDashboardHandler(req, res, next) {
  try {
    logApiSuccess(req, 200, {}, 'DMA Dashboard request initiated');
    return await fetchDashboardData(req, res);
  } catch (error) {
    logApiError(req, 500, error.message, 'DMA Dashboard error');
    return next(error);
  }
}

module.exports = {
  dmaDashboardHandler,
};
