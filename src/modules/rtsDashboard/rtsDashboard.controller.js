const {
  serviceCounts,
  serviceDeptWiseApplications,
  serviceTatWisePending,
  serviceMonthwiseApplicationTrend,
  serviceApplicationStatusSummary,
  serviceDetailedApplicationStatus,
  serviceTopServices,
  serviceServicewiseTopDelay,
  servicePrabhagwiseApplications, serviceCommissionerSummary, serviceAlerts,
  serviceComplaintStatus, serviceRTSComplaints, serviceOfficerWork
} = require('./rtsDashboard.service');
const { auditLog } = require('../../utils/audit-log');
const { logApiSuccess, logApiError } = require('../../utils/log');

function requestMeta(req) {
  return {
    ip: req.ip,
    method: req.method,
    path: req.originalUrl,
  };
}

async function getCounts(req, res, next) {
  try {
    const ulbId = req.query.ulbId || req.user?.ulbId;
    const filters = {
      fromDate: req.query.fromDate || null,
      toDate: req.query.toDate || null,
      deptName: req.query.deptName || null,
      serviceName: req.query.serviceName || null,
      wardName: req.query.wardName || null,
      officerName: req.query.officerName || null,
      status: req.query.status || null,
    };

    const data = await serviceCounts(ulbId, filters);

    logApiSuccess(req, 200, data, 'Dashboard Counts Report completed');

    return res.ok(data);
  } catch (error) {
    logApiError(req, 500, error.message, 'Dashboard Counts Report error');
    return next(error);
  }
}

async function getDeptWiseApplications(req, res, next) {
  try {
    const filters = {
      ulbId: req.query.ulbId ? parseInt(req.query.ulbId) : null,
      username: req.query.username || null,
      serviceId: req.query.serviceId ? parseInt(req.query.serviceId) : null,
      wardId: req.query.wardId ? parseInt(req.query.wardId) : null,
      fromDate: req.query.fromDate || null,
      toDate: req.query.toDate || null,
      status: req.query.status || null,
      prabhagId: req.query.prabhagId ? parseInt(req.query.prabhagId) : null,
    };
    const rows = await serviceDeptWiseApplications(filters);
    logApiSuccess(req, 200, { count: rows?.length || 0 }, 'Department-wise Applications Report completed');
    auditLog({
      action: 'DEPT_WISE_APPLICATIONS',
      actor: req.user?.userId || 'system',
      module: 'rtsDashboard',
      status: 'SUCCESS',
      details: { filters, count: rows?.length || 0 },
      requestMeta: requestMeta(req),
    });
    return res.ok(rows);
  } catch (error) {
    logApiError(req, 500, error.message, 'Department-wise Applications Report error');
    return next(error);
  }
}

async function getTatWisePending(req, res, next) {
  try {
      const filters = {
        ulbId: req.query.ulbId || 1670,
      fromDate: req.query.fromDate || null,
      toDate: req.query.toDate || null,
      serviceName: req.query.serviceName || null,
      wardName: req.query.wardName || null,
      officerName: req.query.officerName || null,
      status: req.query.status || null,
            prabhagId: req.query.prabhagId ? parseInt(req.query.prabhagId) : null,

    };
    const rows = await serviceTatWisePending(filters);
    logApiSuccess(req, 200, { count: rows?.length || 0 }, 'TAT-wise Pending Applications Report completed');
    auditLog({
      action: 'TAT_WISE_PENDING',
      actor: req.user?.userId || 'system',
      module: 'rtsDashboard',
      status: 'SUCCESS',
      details: { filters, count: rows?.length || 0 },
      requestMeta: requestMeta(req),
    });
    return res.ok(rows);
  } catch (error) {
    logApiError(req, 500, error.message, 'TAT-wise Pending Applications Report error');
    return next(error);
  }
}

async function getMonthwiseApplicationTrend(req, res, next) {
  try {
     const filters = {
      ulbId: req.query.ulbId ? parseInt(req.query.ulbId) : null,
      username: req.query.username || null,
      serviceId: req.query.serviceId ? parseInt(req.query.serviceId) : null,
      wardId: req.query.wardId ? parseInt(req.query.wardId) : null,
      fromDate: req.query.fromDate || null,
      toDate: req.query.toDate || null,
            prabhagId: req.query.prabhagId ? parseInt(req.query.prabhagId) : null,

    };
    const rows = await serviceMonthwiseApplicationTrend(filters);
    logApiSuccess(req, 200, { count: rows?.length || 0 }, 'Monthwise Application Trend Report completed');
    auditLog({
      action: 'MONTHWISE_APPLICATION_TREND',
      actor: req.user?.userId || 'system',
      module: 'rtsDashboard',
      status: 'SUCCESS',
      details: { filters, count: rows?.length || 0 },
      requestMeta: requestMeta(req),
    });
    return res.ok(rows);
  } catch (error) {
    logApiError(req, 500, error.message, 'Monthwise Application Trend Report error');
    return next(error);
  }
}

async function getApplicationStatusSummary(req, res, next) {
  try {
    const filters = {
      ulbId: req.query.ulbId || 1670,
      fromDate: req.query.fromDate || null,
      toDate: req.query.toDate || null,
      serviceName: req.query.serviceName || null,
      wardName: req.query.wardName || null,
      officerName: req.query.officerName || null,
      status: req.query.status || null,
            prabhagId: req.query.prabhagId ? parseInt(req.query.prabhagId) : null,

    };
    const data = await serviceApplicationStatusSummary(filters);
    logApiSuccess(req, 200, data, 'Application Status Summary Report completed');
    auditLog({
      action: 'APPLICATION_STATUS_SUMMARY',
      actor: req.user?.userId || 'system',
      module: 'rtsDashboard',
      status: 'SUCCESS',
      details: { filters },
      requestMeta: requestMeta(req),
    });
    return res.ok(data);
  } catch (error) {
    logApiError(req, 500, error.message, 'Application Status Summary Report error');
    return next(error);
  }
}

async function getDetailedApplicationStatus(req, res, next) {
  try {
      const filters = {
        ulbId: req.query.ulbId ? parseInt(req.query.ulbId) : null,
        username: req.query.username || null,
        serviceId: req.query.serviceId ? parseInt(req.query.serviceId) : null,
        wardId: req.query.wardName ? parseInt(req.query.wardName) : null,
        fromDate: req.query.fromDate || null,
        toDate: req.query.toDate || null,
        status: req.query.status || null,
              prabhagId: req.query.prabhagId ? parseInt(req.query.prabhagId) : null,

      };
    const data = await serviceDetailedApplicationStatus(filters);
    logApiSuccess(req, 200, data, 'Detailed Application Status Report completed');
    auditLog({
      action: 'DETAILED_APPLICATION_STATUS',
      actor: req.user?.userId || 'system',
      module: 'rtsDashboard',
      status: 'SUCCESS',
      details: { filters },
      requestMeta: requestMeta(req),
    });
    return res.ok(data);
  } catch (error) {
    logApiError(req, 500, error.message, 'Detailed Application Status Report error');
    return next(error);
  }
}

async function getTopServices(req, res, next) {
  try {
    const filters = {
      ulbId: req.query.ulbId ? parseInt(req.query.ulbId) : null,
      username: req.query.username || null,
      serviceId: req.query.serviceId ? parseInt(req.query.serviceId) : null,
      wardId: req.query.wardId ? parseInt(req.query.wardId) : null,
      fromDate: req.query.fromDate || null,
      toDate: req.query.toDate || null,
      status: req.query.status || null,
            prabhagId: req.query.prabhagId ? parseInt(req.query.prabhagId) : null,

    };
    const rows = await serviceTopServices(filters);
    logApiSuccess(req, 200, { count: rows?.length || 0 }, 'Top Services Report completed');
    auditLog({
      action: 'TOP_SERVICES',
      actor: req.user?.userId || 'system',
      module: 'rtsDashboard',
      status: 'SUCCESS',
      details: { filters, count: rows?.length || 0 },
      requestMeta: requestMeta(req),
    });
    return res.ok(rows);
  } catch (error) {
    logApiError(req, 500, error.message, 'Top Services Report error');
    return next(error);
  }
}

async function getServicewiseTopDelay(req, res, next) {
  try {
     const filters = {
      ulbId: req.query.ulbId ? parseInt(req.query.ulbId) : null,
      username: req.query.username || null,
      serviceId: req.query.serviceId ? parseInt(req.query.serviceId) : null,
      wardId: req.query.wardId ? parseInt(req.query.wardId) : null,
      fromDate: req.query.fromDate || null,
      toDate: req.query.toDate || null,
      status: req.query.status || null, 
            prabhagId: req.query.prabhagId ? parseInt(req.query.prabhagId) : null,

    };
    const rows = await serviceServicewiseTopDelay(filters);
    logApiSuccess(req, 200, { count: rows?.length || 0 }, 'Service-wise Top Delay Report completed');
    auditLog({
      action: 'SERVICEWISE_TOP_DELAY',
      actor: req.user?.userId || 'system',
      module: 'rtsDashboard',
      status: 'SUCCESS',
      details: { filters, count: rows?.length || 0 },
      requestMeta: requestMeta(req),
    });
    return res.ok(rows);
  } catch (error) {
    logApiError(req, 500, error.message, 'Service-wise Top Delay Report error');
    return next(error);
  }
}

async function getPrabhagwiseApplications(req, res, next) {
  try {
      const filters = {
      ulbId: req.query.ulbId ? parseInt(req.query.ulbId) : null,
      username: req.query.username || null,
      serviceId: req.query.serviceId ? parseInt(req.query.serviceId) : null,
      wardId: req.query.wardId ? parseInt(req.query.wardId) : null,
      fromDate: req.query.fromDate || null,
      toDate: req.query.toDate || null,
        status: req.query.status || null,
              prabhagId: req.query.prabhagId ? parseInt(req.query.prabhagId) : null,

    };
    const rows = await servicePrabhagwiseApplications(filters);
    logApiSuccess(req, 200, { count: rows?.length || 0 }, 'Prabhagwise applications completed');
    auditLog({
      action: 'PRABHAGWISE_APPLICATIONS',
      actor: req.user?.userId || 'system',
      module: 'rtsDashboard',
      status: 'SUCCESS',
      details: {filters,  count: rows?.length || 0 },
      requestMeta: requestMeta(req),
    });
    return res.ok(rows);
  } catch (error) {
    logApiError(req, 500, error.message, 'Prabhagwise applications error');
    return next(error);
  }
}

async function getCommissionerSummary(req, res, next) {
  try {
     const filters = {
      ulbId: req.query.ulbId ? parseInt(req.query.ulbId) : null,
      username: req.query.username || null,
      serviceId: req.query.serviceId ? parseInt(req.query.serviceId) : null,
      wardId: req.query.wardId ? parseInt(req.query.wardId) : null,
      fromDate: req.query.fromDate || null,
      toDate: req.query.toDate || null,
      status: req.query.status || null,
            prabhagId: req.query.prabhagId ? parseInt(req.query.prabhagId) : null,

    };
    const rows = await serviceCommissionerSummary(filters);
    logApiSuccess(req, 200, { count: rows?.length || 0 }, 'Commissioner summary completed');
    auditLog({
      action: 'COMMISSIONER_SUMMARY',
      actor: req.user?.userId || 'system',
      module: 'rtsDashboard',
      status: 'SUCCESS',
      details: {filters,  count: rows?.length || 0 },
      requestMeta: requestMeta(req),
    });
    return res.ok(rows);
  } catch (error) {
    logApiError(req, 500, error.message, 'Commissioner summary error');
    return next(error);
  }
}

async function getAlerts(req, res, next) {
   try {
    const ulbId = req.query.ulbId || req.user?.ulbId;
     const username = req.query.username || null;
      const serviceId = req.query.serviceId ? parseInt(req.query.serviceId) : null;
      const wardId = req.query.wardId ? parseInt(req.query.wardId) : null;
      const fromDate = req.query.fromDate || null;
      const toDate = req.query.toDate || null;
      const status = req.query.status || null;
     const  prabhagId= req.query.prabhagId ? parseInt(req.query.prabhagId) : null;

    const rows = await serviceAlerts(ulbId, username, serviceId, wardId, fromDate, toDate, status, prabhagId);
    logApiSuccess(req, 200, { count: rows?.length || 0 }, 'Alerts fetched');
    auditLog({
      action: 'ALERTS',
      actor: req.user?.userId || 'system',
      module: 'rtsDashboard',
      status: 'SUCCESS',
      details: { ulbId, count: rows?.length || 0 },
      requestMeta: requestMeta(req),
    });
    return res.ok(rows);
  } catch (error) {
    logApiError(req, 500, error.message, 'Alerts error');
    return next(error);
  }
}

async function getComplaintStatus(req, res, next) {
  try {
    const ulbId = req.query.ulbId || req.user?.ulbId;
    const rows = await serviceComplaintStatus(ulbId);
    logApiSuccess(req, 200, { count: rows?.length || 0 }, 'Complaint status fetched');
    auditLog({
      action: 'COMPLAINT_STATUS',
      actor: req.user?.userId || 'system',
      module: 'rtsDashboard',
      status: 'SUCCESS',
      details: { count: rows?.length || 0 },
      requestMeta: requestMeta(req),
    });
    return res.ok(rows);
  } catch (error) {
    logApiError(req, 500, error.message, 'Complaint status error');
    return next(error);
  }
}

async function getRTSComplaints(req, res, next) {
  try {
    const ulbId = req.query.ulbId || req.user?.ulbId;
    const rows = await serviceRTSComplaints(ulbId);
    logApiSuccess(req, 200, { count: rows?.length || 0 }, 'RTS Complaints fetched');
    auditLog({
      action: 'RTS_COMPLAINTS',
      actor: req.user?.userId || 'system',
      module: 'rtsDashboard',
      status: 'SUCCESS',
      details: { count: rows?.length || 0 },
      requestMeta: requestMeta(req),
    });
    return res.ok(rows);
  } catch (error) {
    logApiError(req, 500, error.message, 'RTS Complaints error');
    return next(error);
  }
}

async function getOfficerWork(req, res, next) {
  try {
      const filters = {
      ulbId: req.query.ulbId ? parseInt(req.query.ulbId) : null,
      username: req.query.username || null,
      serviceId: req.query.serviceId ? parseInt(req.query.serviceId) : null,
      wardId: req.query.wardId ? parseInt(req.query.wardId) : null,
      fromDate: req.query.fromDate || null,
      toDate: req.query.toDate || null,
      status: req.query.status || null,
            prabhagId: req.query.prabhagId ? parseInt(req.query.prabhagId) : null,

    };
    const rows = await serviceOfficerWork(filters);
    logApiSuccess(req, 200, { count: rows?.length || 0 }, 'Officer work fetched');
    auditLog({
      action: 'OFFICER_WORK',
      actor: req.user?.userId || 'system',
      module: 'rtsDashboard',
      status: 'SUCCESS',
      details: {filters, count: rows?.length || 0 },
      requestMeta: requestMeta(req),
    });
    return res.ok(rows);
  } catch (error) {
    logApiError(req, 500, error.message, 'Officer Work error');
    return next(error);
  }
}

module.exports = {
  getCounts,
  getDeptWiseApplications,
  getTatWisePending,
  getMonthwiseApplicationTrend,
  getApplicationStatusSummary,
  getDetailedApplicationStatus,
  getTopServices,
  getServicewiseTopDelay,
  getPrabhagwiseApplications, getCommissionerSummary, getAlerts,
  getComplaintStatus, getRTSComplaints, getOfficerWork
};
