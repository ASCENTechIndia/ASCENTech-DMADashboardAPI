const { z } = require('zod');

const dailyVisitQuerySchema = z.object({
  userId: z.string().trim().min(1, 'userId is required'),
  fromDate: z.string().trim().optional(),
  toDate: z.string().trim().optional(),
}).passthrough();

module.exports = {
  dailyVisitQuerySchema,
};
