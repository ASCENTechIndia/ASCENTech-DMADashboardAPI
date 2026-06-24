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

const rtsULBDeptWiseQuerySchema = z.object({
  ulbId: z.coerce.number().int().positive({ message: "ulbId must be a positive integer" })
}).passthrough();

const rtsULBServiceWiseQuerySchema = z.object({
  ulbId: z.coerce.number().int().positive({ message: "ulbId must be a positive integer" }),
  deptId: z.coerce.number().int().positive({ message: "deptId must be a positive integer" })
}).passthrough();

const rtsStatusWiseQuerySchema = z.object({
  status: z.string({ message: "status is required" }),
  ulbId: z.coerce.number().int().positive({ message: "ulbId must be a positive integer" }).optional()
}).passthrough();


/**
 * Schema for DMA Dashboard data fetching
 * Returns modules with metrics and color-coded status based on data freshness
 */
module.exports = {
  dmaDashboardQuerySchema,
  rtsULBWiseQuerySchema,
  rtsULBDeptWiseQuerySchema,
  rtsULBServiceWiseQuerySchema,
  rtsStatusWiseQuerySchema,
};
