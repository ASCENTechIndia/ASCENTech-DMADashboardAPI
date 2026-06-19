const express = require('express');
const validate = require('../../../middleware/validate.middleware');
const { authRequired } = require('../../../middleware/auth');
const { activeAgentsDashboardQuerySchema } = require('./activeAgents.validation');
const { activeAgentsDashboardHandler } = require('./activeAgents.controller');

const router = express.Router();

router.get(
  '/dashboard',
  validate(activeAgentsDashboardQuerySchema, { source: 'query' }),
  activeAgentsDashboardHandler
);

module.exports = router;
