const Joi = require('joi');

const countsSchema = Joi.object({
  ulbid: Joi.number().required()
});

const deptWiseApplicationsSchema = Joi.object({
  ulbid: Joi.number().required()
});

const tatWisePendingSchema = Joi.object({
  ulbid: Joi.number().required()
});

const monthwiseApplicationTrendSchema = Joi.object({
  ulbid: Joi.number().required()
});

const applicationStatusSummarySchema = Joi.object({
  ulbid: Joi.number().required()
});

const detailedApplicationStatusSchema = Joi.object({
  ulbid: Joi.number().required()
});

const topServicesSchema = Joi.object({
  ulbid: Joi.number().optional()
});

const servicewiseTopDelaySchema = Joi.object({
  ulbid: Joi.number().optional()
});

module.exports = {
  countsSchema,
  deptWiseApplicationsSchema,
  tatWisePendingSchema,
  monthwiseApplicationTrendSchema,
  applicationStatusSummarySchema,
  detailedApplicationStatusSchema,
  topServicesSchema,
  servicewiseTopDelaySchema
};
