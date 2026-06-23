const Joi = require('joi');

const getTopCountsSchema = Joi.object({
  ulbId: Joi.number().optional(),
  username: Joi.string().optional(),
  serviceId: Joi.number().optional(),
  wardId: Joi.number().optional(),
  fromDate: Joi.string().optional(),
  toDate: Joi.string().optional(),
  status: Joi.string().optional(),
});

module.exports = {
  getTopCountsSchema,
};
