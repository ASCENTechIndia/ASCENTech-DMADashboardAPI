const express = require('express');
const activeAgentsRoutes = require('../modules/Dashboard/ActiveAgents/activeAgents.routes');
const dispositionDashboardRoutes = require('../modules/Dashboard/DispositionDashboard/dispositionDashboard.routes');
const dailyVisitRoutes = require('../modules/Dashboard/DailyVisit/dailyVisit.routes');

const router = express.Router();

router.get('/health', (req, res) => {
  return res.ok(null, 'ok');
});

router.get('/ready', (req, res) => {
  return res.ok(null, 'ready');
});

router.use('/active-agents', activeAgentsRoutes);
router.use('/disposition-dashboard', dispositionDashboardRoutes);
router.use('/daily-visit', dailyVisitRoutes);

module.exports = router;
