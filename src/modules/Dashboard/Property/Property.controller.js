const { fetchTilesData, fetchModewiseCollection, fetchPropertySummary,
  fetchCollectioninPerct, fetchTotalPerfCorpbyColl, fetchTotalPerfCorpCollection
 } = require('./Property.service');
const { logApiSuccess, logApiError } = require('../../../utils/log');

/**
 * Controller handler for fetching DMA Dashboard data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
async function getTilesDataHandler(req, res, next) {
  try {
    logApiSuccess(req, 200, {}, 'DMA Prop Tiles request initiated');
    return await fetchTilesData(req, res);
  } catch (error) {
    logApiError(req, 500, error.message, 'DMA Prop Tiles error');
    return next(error);
  }
}

/**
 * Controller handler for fetching RTS ULB Wise data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */

async function getModewiseCollectionHandler(req, res, next) {
  try {
    logApiSuccess(req, 200, {}, 'Modewise Collection request initiated');
    return await fetchModewiseCollection(req, res);
  } catch (error) {
    logApiError(req, 500, error.message, 'Modewise Collection error');
    return next(error);
  }
}

async function getPropertySummaryHandler(req, res, next) {
  try {
    logApiSuccess(req, 200, {}, 'Property Summary request initiated');
    return await fetchPropertySummary(req, res);
  } catch (error) {
    logApiError(req, 500, error.message, 'Property Summary error');
    return next(error);
  }
}

async function getCollectioninPerctHandler(req, res, next) {
  try {
    logApiSuccess(req, 200, {}, 'Collection in Percentage request initiated');
    return await fetchCollectioninPerct(req, res);
  } catch (error) {
    logApiError(req, 500, error.message, 'Collection in Percentage error');
    return next(error);
  }
}

async function getTotalPerfCorpbyCollHandler(req, res, next) {
  try {
    logApiSuccess(req, 200, {}, 'Total Performance Corporation request initiated');
    return await fetchTotalPerfCorpbyColl(req, res);
  } catch (error) {
    logApiError(req, 500, error.message, 'Total Performance Corporation error');
    return next(error);
  }
}

async function getTotalPerfCorpCollectionHandler(req, res, next) {
  try {
    logApiSuccess(req, 200, {}, 'Total Performance Collection request initiated');
    return await fetchTotalPerfCorpCollection(req, res);
  } catch (error) {
    logApiError(req, 500, error.message, 'Total Performance Collection error');
    return next(error);
  }
}

module.exports = {
  getTilesDataHandler, getModewiseCollectionHandler, getPropertySummaryHandler, getCollectioninPerctHandler,
  getTotalPerfCorpbyCollHandler, getTotalPerfCorpCollectionHandler
};
