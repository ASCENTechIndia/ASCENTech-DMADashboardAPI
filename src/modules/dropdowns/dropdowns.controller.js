const {serviceStatusDropdown, serviceGetServices, serviceGetWards, serviceGetUsers, serviceGetWardsByUlbId} = require('./dropdowns.service');
const { auditLog } = require('../../utils/audit-log');
const { logApiSuccess, logApiError } = require('../../utils/log');

function requestMeta(req) {
  return {
    ip: req.ip,
    method: req.method,
    path: req.originalUrl,
  };
}

async function getServices(req, res, next) {
  try {
    const ulbId = req.query.ulbid || 1670;
    const deptId = req.query.deptId || null;
    const data = await serviceGetServices(ulbId,deptId);
    logApiSuccess(req, 200, { count: data?.length || 0 }, 'Services Report completed');
    auditLog({
      action: 'GET_SERVICES',
      actor: req.user?.userId ,
      module: 'dropdowns',
      status: 'SUCCESS',
      details: { ulbId },
      requestMeta: requestMeta(req),
    });
    return res.ok(data);
  } catch (error) {
    logApiError(req, 500, error.message, 'Services Report error');
    return next(error);
  }
}








async function getWards(req, res, next) {
  try {
    const ulbId = req.query.ulbid || 1670;
    const data = await serviceGetWards(ulbId);
    logApiSuccess(req, 200, { count: data?.length || 0 }, 'Wards Report completed');
    auditLog({
      action: 'GET_WARDS',
      actor: req.user?.userId ,
      module: 'dropdowns',
      status: 'SUCCESS',
      details: { ulbId },
      requestMeta: requestMeta(req),
    });
    return res.ok(data);
  } catch (error) {
    logApiError(req, 500, error.message, 'Wards Report error');
    return next(error);
  }
}

async function getUsers(req, res, next) {
  try {
    const ulbId = req.query.ulbid || 1670;
    const data = await serviceGetUsers(ulbId);
    logApiSuccess(req, 200, { count: data?.length || 0 }, 'Users Report completed');
    auditLog({
      action: 'GET_USERS',
      actor: req.user?.userId ,
      module: 'dropdowns',
      status: 'SUCCESS',
      details: { ulbId },
      requestMeta: requestMeta(req),
    });
    return res.ok(data);
  } catch (error) {
    logApiError(req, 500, error.message, 'Users Report error');
    return next(error);
  }
}

async function getWardsByUlbId(req, res, next) {
  try {
    const ulbId = req.query.ulbid || 1670;
    const data = await serviceGetWardsByUlbId(ulbId);
    logApiSuccess(req, 200, { count: data?.length || 0 }, 'Wards By ULB ID Report completed');
    auditLog({
      action: 'GET_WARDS_BY_ULB_ID',
      actor: req.user?.userId ,
      module: 'dropdowns',
      status: 'SUCCESS',
      details: { ulbId },
      requestMeta: requestMeta(req),
    });
    return res.ok(data);
  } catch (error) {
    logApiError(req, 500, error.message, 'Wards By ULB ID Report error');
    return next(error);
  }
}

async function getStatusDropdown(req, res, next) {
  try {
     const ulbId = req.query.ulbId || req.user?.ulbId;
    const data = await serviceStatusDropdown(ulbId);
     logApiSuccess(req, 200, data, 'Status Dropdown completed');
       auditLog({
         action: 'STATUS_DROPDOWN',
         actor: req.user?.userId || 'system',
         module: 'rtsDashboard',
         status: 'SUCCESS',
         details: { ulbId },
         requestMeta: requestMeta(req),
       });
       return res.ok(data);
     } catch (error) {
       logApiError(req, 500, error.message, 'Status Dropdown error');
       return next(error);
     }
   }

module.exports = {getStatusDropdown, getServices, getWards, getWardsByUlbId, getUsers}
