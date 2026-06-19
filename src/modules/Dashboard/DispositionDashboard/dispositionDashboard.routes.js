const express = require('express');
const validate = require('../../../middleware/validate.middleware');
const { authRequired } = require('../../../middleware/auth');
const { dispositionDashboardQuerySchema } = require('./dispositionDashboard.validation');
const { dispositionDashboardHandler } = require('./dispositionDashboard.controller');

const router = express.Router();

router.get(
  '/report',
  validate(dispositionDashboardQuerySchema, { source: 'query' }),
  dispositionDashboardHandler
);

module.exports = router;
