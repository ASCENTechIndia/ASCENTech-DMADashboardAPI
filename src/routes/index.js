const express = require('express');

const router = express.Router();


router.use('/dashboard', require('../modules/Dashboard/DMADashboard/DMADashboard.routes'));
router.use('/property', require('../modules/Dashboard/Property/Property.routes'));

module.exports = router;
