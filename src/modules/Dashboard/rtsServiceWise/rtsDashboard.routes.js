const express = require('express');
const validate = require('../../../middleware/validate.middleware');
const {
  getDepartmentsQuerySchema,
  getServicesQuerySchema,
  getTableDataQuerySchema,
} = require('./rtsDashboard.Validation');

const {
  getDepartments,
  getServices,
  getTableData,
} = require('./rtsDashboard.Controller');

const router = express.Router();

router.get('/getDepartments', validate(getDepartmentsQuerySchema, { source: 'query' }), getDepartments);

router.get('/getServices', validate(getServicesQuerySchema, { source: 'query' }), getServices);

router.get('/getTableData', validate(getTableDataQuerySchema, { source: 'query' }), getTableData);

module.exports = router;
