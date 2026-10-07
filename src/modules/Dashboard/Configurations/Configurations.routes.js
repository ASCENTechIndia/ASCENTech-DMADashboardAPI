const express = require('express');
const validate = require('../../../middleware/validate.middleware');
const { dashboardModulesQuerySchema } = require('./Configurations.validation');
const { getDashboardModules } = require('./Configurations.controller');

const router = express.Router();

router.get(
  '/dashboardModules',
  validate(dashboardModulesQuerySchema, { source: 'query' }),
  getDashboardModules
);

module.exports = router;
