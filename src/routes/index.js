const express = require('express');
const authRoutes = require('../modules/auth/auth.routes');

const router = express.Router();


router.use('/auth', authRoutes);
router.use('/rts-dashboard', require('../modules/rtsDashboard/rtsDashboard.routes'));
router.use('/dropdowns', require('../modules/dropdowns/dropdowns.routes'));
router.use('/topcounts', require('../modules/topcounts/topcounts.routes'));

module.exports = router;
