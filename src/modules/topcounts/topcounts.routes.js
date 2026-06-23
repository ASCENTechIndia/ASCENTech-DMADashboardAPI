const express = require('express');
const { authRequired } = require('../../middleware/auth');
const {
  getTopCounts,
  getApprovedCounts,
  getPendingCounts,
  getDelayedCounts,
  getTodaysApplications,
  getTodaysApproved,
} = require('./topcounts.controller');

const router = express.Router();

router.get('/totalApplications', getTopCounts);
router.get('/approvedApplications', getApprovedCounts);
router.get('/pendingApplications', getPendingCounts);
router.get('/delayedApplications', getDelayedCounts);
router.get('/todaysApplications', getTodaysApplications);
router.get('/todaysApproved', getTodaysApproved);

module.exports = router;
