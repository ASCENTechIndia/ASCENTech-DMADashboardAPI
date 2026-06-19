const { z } = require('zod');

const dispositionDashboardQuerySchema = z.object({
  monthYear: z
    .string()
    .trim()
    .regex(/^(0[1-9]|1[0-2])\s*-\s*\d{4}$/, 'monthYear must be in MM-YYYY or MM - YYYY format')
    .optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2024).max(new Date().getFullYear() + 1).optional(),
  userOf: z.enum(['0', '1']).optional(),
}).passthrough();

module.exports = {
  dispositionDashboardQuerySchema,
};
