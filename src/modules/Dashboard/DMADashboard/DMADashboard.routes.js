const express = require('express');
const validate = require('../../../middleware/validate.middleware');
const { authRequired } = require('../../../middleware/auth');
const { dmaDashboardQuerySchema } = require('./DMADashboard.validation');
const { dmaDashboardHandler } = require('./DMADashboard.controller');

const router = express.Router();

/**
 * GET /api/dashboard/dma
 * Fetch DMA Dashboard data with modules, metrics, and status information
 */
router.get(
  '/DashboardDataNew ',
  dmaDashboardHandler
);

module.exports = router;
