const { z } = require('zod');

const activeAgentsDashboardQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2024).max(new Date().getFullYear() + 1).optional(),
}).passthrough();

module.exports = {
  activeAgentsDashboardQuerySchema,
};
