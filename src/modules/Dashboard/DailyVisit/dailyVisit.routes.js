const express = require('express');
const validate = require('../../../middleware/validate.middleware');
const { dailyVisitQuerySchema } = require('./dailyVisit.validation');
const { dailyVisitDashboardHandler } = require('./dailyVisit.controller');

const router = express.Router();

router.get(
  '/dashboard',
  validate(dailyVisitQuerySchema, { source: 'query' }),
  dailyVisitDashboardHandler
);

module.exports = router;
