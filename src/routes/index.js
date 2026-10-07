const express = require('express');

const router = express.Router();


router.use('/dashboard', require('../modules/Dashboard/DMADashboard/DMADashboard.routes'));
router.use('/property', require('../modules/Dashboard/Property/Property.routes'));
router.use('/rtsServiceWise', require('../modules/Dashboard/rtsServiceWise/rtsDashboard.routes'));
router.use('/configurations', require('../modules/Dashboard/Configurations/Configurations.routes'));

module.exports = router;
