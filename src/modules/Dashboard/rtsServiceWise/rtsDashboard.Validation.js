const { z } = require('zod');

const getDepartmentsQuerySchema = z.object({
  ulbId: z.coerce.number().optional(),
}).passthrough();

const getServicesQuerySchema = z.object({
  ulbId: z.coerce.number().optional(),
  deptId: z.coerce.number().optional(),
}).passthrough();

const getTableDataQuerySchema = z.object({
  ulbId: z.coerce.number().optional(),
  deptId: z.coerce.number().optional(),
  serviceId: z.coerce.number().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  status: z.string().optional(),
}).passthrough();

module.exports = {
  getDepartmentsQuerySchema,
  getServicesQuerySchema,
  getTableDataQuerySchema,
};
