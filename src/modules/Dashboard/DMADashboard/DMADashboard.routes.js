const express = require('express');
const validate = require('../../../middleware/validate.middleware');
const { authRequired } = require('../../../middleware/auth');
const { dmaDashboardQuerySchema, rtsULBWiseQuerySchema } = require('./DMADashboard.validation');
const { dmaDashboardHandler, rtsULBWiseHandler } = require('./DMADashboard.controller');

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
 * GET /api/dashboard/RTSULBWiseadd
 * Fetch RTS ULB wise data with application status breakdown
 */
router.get(
  '/RTSULBWiseadd',
  validate(rtsULBWiseQuerySchema, { source: 'query' }),
  rtsULBWiseHandler
);

module.exports = router;
