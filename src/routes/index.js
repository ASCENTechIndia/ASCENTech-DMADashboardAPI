const express = require('express');

const router = express.Router();


router.use('/dashboard', require('../modules/Dashboard/DMADashboard/DMADashboard.routes'));


module.exports = router;
