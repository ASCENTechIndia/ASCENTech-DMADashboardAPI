const {
  serviceGetTopCounts,
  serviceGetApprovedCounts,
  serviceGetPendingCounts,
  serviceGetDelayedCounts,
  serviceGetTodaysApplications,
  serviceGetTodaysApproved,
} = require('./topcounts.service');
const { auditLog } = require('../../utils/audit-log');
const { logApiSuccess, logApiError } = require('../../utils/log');

function requestMeta(req) {
  return {
    ip: req.ip,
    method: req.method,
    path: req.originalUrl,
  };
}

function buildFilters(req) {
  const ulbId = req.query.ulbId || null;
  return {
    ulbId: ulbId ? parseInt(ulbId, 10) : null,
    username: req.query.username || null,
    serviceId: req.query.serviceId ? parseInt(req.query.serviceId, 10) : null,
    wardId: req.query.wardId ? parseInt(req.query.wardId, 10) : null,
    fromDate: req.query.fromDate || null,
    toDate: req.query.toDate || null,
    status: req.query.status || null,
    prabhagId: req.query.prabhagId ? parseInt(req.query.prabhagId, 10) : null,
  };
}

async function getTopCounts(req, res, next) {
  try {
    const filters = buildFilters(req);
    const data = await serviceGetTopCounts(filters);

    logApiSuccess(req, 200, data, 'Total Applications Count Report completed');
    auditLog({
      action: 'TOP_COUNTS_APPLICATIONS',
      actor: req.user?.userId || 'system',
      module: 'topcounts',
      status: 'SUCCESS',
      details: { filters, result: data },
      requestMeta: requestMeta(req),
    });

    return res.ok(data);
  } catch (error) {
    logApiError(req, 500, error.message, 'Total Applications Count Report error');
    return next(error);
  }
}

async function getApprovedCounts(req, res, next) {
  try {
    const filters = buildFilters(req);
    const data = await serviceGetApprovedCounts(filters);

    logApiSuccess(req, 200, data, 'Approved Applications Count Report completed');
    auditLog({
      action: 'TOP_COUNTS_APPROVED_APPLICATIONS',
      actor: req.user?.userId || 'system',
      module: 'topcounts',
      status: 'SUCCESS',
      details: { filters, result: data },
      requestMeta: requestMeta(req),
    });

    return res.ok(data);
  } catch (error) {
    logApiError(req, 500, error.message, 'Approved Applications Count Report error');
    return next(error);
  }
}

async function getPendingCounts(req, res, next) {
  try {
    const filters = buildFilters(req);
    const data = await serviceGetPendingCounts(filters);

    logApiSuccess(req, 200, data, 'Pending Applications Count Report completed');
    auditLog({
      action: 'TOP_COUNTS_PENDING_APPLICATIONS',
      actor: req.user?.userId || 'system',
      module: 'topcounts',
      status: 'SUCCESS',
      details: { filters, result: data },
      requestMeta: requestMeta(req),
    });

    return res.ok(data);
  } catch (error) {
    logApiError(req, 500, error.message, 'Pending Applications Count Report error');
    return next(error);
  }
}

async function getDelayedCounts(req, res, next) {
  try {
    const filters = buildFilters(req);
    const data = await serviceGetDelayedCounts(filters);

    logApiSuccess(req, 200, data, 'Delayed Applications Count Report completed');
    auditLog({
      action: 'TOP_COUNTS_DELAYED_APPLICATIONS',
      actor: req.user?.userId || 'system',
      module: 'topcounts',
      status: 'SUCCESS',
      details: { filters, result: data },
      requestMeta: requestMeta(req),
    });

    return res.ok(data);
  } catch (error) {
    logApiError(req, 500, error.message, 'Delayed Applications Count Report error');
    return next(error);
  }
}

async function getTodaysApplications(req, res, next) {
  try {
    const filters = buildFilters(req);
    const data = await serviceGetTodaysApplications(filters);

    logApiSuccess(req, 200, data, 'Today\'s Applications Count Report completed');
    auditLog({
      action: 'TOP_COUNTS_TODAYS_APPLICATIONS',
      actor: req.user?.userId || 'system',
      module: 'topcounts',
      status: 'SUCCESS',
      details: { filters, result: data },
      requestMeta: requestMeta(req),
    });

    return res.ok(data);
  } catch (error) {
    logApiError(req, 500, error.message, 'Today\'s Applications Count Report error');
    return next(error);
  }
}

async function getTodaysApproved(req, res, next) {
  try {
    const filters = buildFilters(req);
    const data = await serviceGetTodaysApproved(filters);

    logApiSuccess(req, 200, data, 'Today\'s Approved Applications Count Report completed');
    auditLog({
      action: 'TOP_COUNTS_TODAYS_APPROVED',
      actor: req.user?.userId || 'system',
      module: 'topcounts',
      status: 'SUCCESS',
      details: { filters, result: data },
      requestMeta: requestMeta(req),
    });

    return res.ok(data);
  } catch (error) {
    logApiError(req, 500, error.message, 'Today\'s Approved Applications Count Report error');
    return next(error);
  }
}

module.exports = {
  getTopCounts,
  getApprovedCounts,
  getPendingCounts,
  getDelayedCounts,
  getTodaysApplications,
  getTodaysApproved,
};
