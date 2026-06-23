const { z } = require('zod');

const dmaDashboardQuerySchema = z.object({
  // Optional filters for DMA Dashboard
  // ulbId: z.coerce.number().int().positive().optional(),
}).passthrough();

/**
 * Schema for RTS ULB Wise data fetching
 * Returns corporation-wise RTS application status breakdown
 */
const rtsULBWiseQuerySchema = z.object({
  // Optional filters for RTS ULB Wise data
}).passthrough();

/**
 * Schema for DMA Dashboard data fetching
 * Returns modules with metrics and color-coded status based on data freshness
 */
module.exports = {
  dmaDashboardQuerySchema,
  rtsULBWiseQuerySchema,
};
