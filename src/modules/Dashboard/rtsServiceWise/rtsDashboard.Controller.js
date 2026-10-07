const {
  serviceGetDepartments,
  serviceGetServices,
  serviceTableData,
} = require('./rtsDashboard.Service');
const { auditLog } = require('../../../utils/audit-log');
const { logApiSuccess, logApiError } = require('../../../utils/log');

function requestMeta(req) {
  return {
    ip: req.ip,
    method: req.method,
    path: req.originalUrl,
  };
}

async function getDepartments(req, res, next) {
  try {
    const ulbId = req.query.ulbId ? parseInt(req.query.ulbId, 10) : (req.user?.ulbId || 1670);
    const rows = await serviceGetDepartments(ulbId);
    logApiSuccess(req, 200, { count: rows?.length || 0 }, 'Departments list fetched');
    return res.ok(rows, 'Departments list fetched successfully');
  } catch (error) {
    logApiError(req, 500, error.message, 'Departments list fetch error');
    return next(error);
  }
}

async function getServices(req, res, next) {
  try {
    const ulbId = req.query.ulbId ? parseInt(req.query.ulbId, 10) : (req.user?.ulbId || 1670);
    const deptId = req.query.deptId ? parseInt(req.query.deptId, 10) : null;
    const rows = await serviceGetServices(ulbId, deptId);
    logApiSuccess(req, 200, { count: rows?.length || 0 }, 'Services list fetched');
    return res.ok(rows, 'Services list fetched successfully');
  } catch (error) {
    logApiError(req, 500, error.message, 'Services list fetch error');
    return next(error);
  }
}

async function getTableData(req, res, next) {
  try {
    const filters = {
      ulbId: req.query.ulbId ? parseInt(req.query.ulbId, 10) : (req.user?.ulbId || 1670),
      deptId: req.query.deptId ? parseInt(req.query.deptId, 10) : null,
      serviceId: req.query.serviceId ? parseInt(req.query.serviceId, 10) : null,
      fromDate: req.query.fromDate || null,
      toDate: req.query.toDate || null,
      status: req.query.status || null,
    };

    const data = await serviceTableData(filters);
    logApiSuccess(req, 200, { count: data?.tableData?.length || 0 }, 'Table data fetched');
    auditLog({
      action: 'RTS_SERVICE_WISE_TABLE_DATA',
      actor: req.user?.userId || 'system',
      module: 'rtsServiceWise',
      status: 'SUCCESS',
      details: { filters, count: data?.tableData?.length || 0 },
      requestMeta: requestMeta(req),
    });
    return res.ok(data, 'Table data fetched successfully');
  } catch (error) {
    logApiError(req, 500, error.message, 'Table data fetch error');
    return next(error);
  }
}

module.exports = {
  getDepartments,
  getServices,
  getTableData,
};
