const { z } = require('zod');

const dashboardModulesQuerySchema = z.object({
  ulbId: z.coerce.number().int().positive().default(2),
}).passthrough();

module.exports = {
  dashboardModulesQuerySchema,
};
