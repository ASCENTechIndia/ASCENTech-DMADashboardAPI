const express = require('express');
const { authRequired } = require('../../middleware/auth');
const {
  getCounts,
  getDeptWiseApplications,
  getTatWisePending,
  getMonthwiseApplicationTrend,
  getApplicationStatusSummary,
  getDetailedApplicationStatus,
  getTopServices,
  getServicewiseTopDelay, getPrabhagwiseApplications, getCommissionerSummary, getAlerts, getComplaintStatus,
  getRTSComplaints, getOfficerWork
} = require('./rtsDashboard.controller');

const router = express.Router();

router.get('/counts', getCounts);
router.get('/deptWiseApplications', getDeptWiseApplications);
router.get('/tatWisePending', getTatWisePending);
router.get('/monthwiseApplicationTrend', getMonthwiseApplicationTrend);
router.get('/applicationStatusSummary', getApplicationStatusSummary);
router.get('/detailedApplicationStatus', getDetailedApplicationStatus);
router.get('/topServices', getTopServices);
router.get('/servicewiseTopDelay', getServicewiseTopDelay);
router.get('/getPrabhagwiseApplications', getPrabhagwiseApplications);
router.get('/getCommissionerSummary', getCommissionerSummary);
router.get('/getAlerts', getAlerts);
router.get('/getComplaintStatus', getComplaintStatus);
router.get('/getRTSComplaints', getRTSComplaints);
router.get('/getOfficerWork', getOfficerWork);

module.exports = router;
