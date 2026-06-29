const express = require('express');
const validate = require('../../../middleware/validate.middleware');
const { authRequired } = require('../../../middleware/auth');
const { getTilesDataQuerySchema, getModewiseCollectionQuerySchema,getPropertySummaryQuerySchema,
  getCollectioninPerctQuerySchema, getTotalPerfCorpbyCollSchema, getTotalPerfCorpCollectionSchema,
  getTodaysCollectionSchema
  } = require('./Property.validation');
const { getTilesDataHandler, getModewiseCollectionHandler,getPropertySummaryHandler,
  getCollectioninPerctHandler, getTotalPerfCorpbyCollHandler, getTotalPerfCorpCollectionHandler,
  getTodaysCollectionHandler
 } = require('./Property.controller');

const router = express.Router();

router.get(
  '/getTilesData',
  validate(getTilesDataQuerySchema, { source: 'query' }),
  getTilesDataHandler
);

router.get(
  '/getModewiseCollection',
  validate(getModewiseCollectionQuerySchema, { source: 'query' }),
  getModewiseCollectionHandler
);

router.get(
  '/getPropertySummary',
  validate(getPropertySummaryQuerySchema, { source: 'query' }),
  getPropertySummaryHandler
);

router.get(
  '/getCollectioninPerct',
  validate(getCollectioninPerctQuerySchema, { source: 'query' }),
  getCollectioninPerctHandler
);

router.get(
  '/getTotalPerfCorpbyColl',
  validate(getTotalPerfCorpbyCollSchema, { source: 'query' }),
  getTotalPerfCorpbyCollHandler
);

router.get(
  '/getTotalPerfCorpCollection',
  validate(getTotalPerfCorpCollectionSchema, { source: 'query' }),
  getTotalPerfCorpCollectionHandler
);

router.get(
  '/getTodaysCollection',
  validate(getTodaysCollectionSchema, { source: 'query' }),
  getTodaysCollectionHandler
);

module.exports = router;
