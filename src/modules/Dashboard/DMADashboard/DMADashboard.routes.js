const express = require('express');
const validate = require('../../../middleware/validate.middleware');
const { authRequired } = require('../../../middleware/auth');
const { dmaDashboardQuerySchema, lastSyncDateQuerySchema, ulbListQuerySchema, rtsULBWiseQuerySchema, rtsULBDeptWiseQuerySchema, rtsULBServiceWiseQuerySchema, rtsStatusWiseQuerySchema, rtsApplicationDetailQuerySchema, monthwiseFetchQuerySchema } = require('./DMADashboard.validation');
const { dmaDashboardHandler, lastSyncDateHandler, ulbListHandler, rtsULBWiseHandler, rtsULBDeptWiseHandler, rtsULBServiceWiseHandler, rtsStatusWiseHandler, rtsApplicationDetailHandler, monthwiseFetchHandler } = require('./DMADashboard.controller');


const router = express.Router();

/**
 * GET /api/dashboard/DashboardDataNew
 * Fetch DMA Dashboard data with modules, metrics, and status information
 */
router.get(
  '/DashboardDataNew',
  validate(dmaDashboardQuerySchema, { source: 'query' }),
  dmaDashboardHandler
);

/**
 * GET /api/dashboard/LastSyncDate
 * Fetch Last Sync Date
 */
router.get(
  '/LastSyncDate',
  validate(lastSyncDateQuerySchema, { source: 'query' }),
  lastSyncDateHandler
);

/**
 * GET /api/dashboard/ULBList
 * Fetch ULB (Corporation) list for dropdown
 */
router.get(
  '/ULBList',
  validate(ulbListQuerySchema, { source: 'query' }),
  ulbListHandler
);

/**
 * GET /api/dashboard/RTSULBWiseadd
 * Fetch RTS ULB wise data with application status breakdown
 */
router.get(
  '/RTSULBWiseadd',
  validate(rtsULBWiseQuerySchema, { source: 'query' }),
  rtsULBWiseHandler
);

/**
 * GET /api/dashboard/RTSULBDeptWise
 * Fetch RTS ULB Department Wise data with application status breakdown
 */
router.get(
  '/RTSULBDeptWise',
  validate(rtsULBDeptWiseQuerySchema, { source: 'query' }),
  rtsULBDeptWiseHandler
);

/**
 * GET /api/dashboard/RTSULBServiceWise
 * Fetch RTS ULB Service Wise data with application status breakdown
 */
router.get(
  '/RTSULBServiceWise',
  validate(rtsULBServiceWiseQuerySchema, { source: 'query' }),
  rtsULBServiceWiseHandler
);

/**
 * GET /api/dashboard/RTSStatusWise
 * Fetch RTS Status Wise data
 */
router.get(
  '/RTSStatusWise',
  validate(rtsStatusWiseQuerySchema, { source: 'query' }),
  rtsStatusWiseHandler
);

/**
 * GET /api/dashboard/RTSApplicationDetail
 * Fetch RTS Application Detail data
 */
router.get(
  '/RTSApplicationDetail',
  validate(rtsApplicationDetailQuerySchema, { source: 'query' }),
  rtsApplicationDetailHandler
);


/**
 * GET /api/dashboard/MonthwiseFetch
 * Fetch monthwise dashboard data
 */
router.get(
  '/MonthwiseFetch',
  validate(monthwiseFetchQuerySchema, { source: 'query' }),
  monthwiseFetchHandler
);

/**
 * POST /api/dashboard/MonthwiseFetch
 * Fetch monthwise dashboard data (using payload)
 */
router.post(
  '/MonthwiseFetch',
  validate(monthwiseFetchQuerySchema, { source: 'body' }),
  monthwiseFetchHandler
);

module.exports = router;
