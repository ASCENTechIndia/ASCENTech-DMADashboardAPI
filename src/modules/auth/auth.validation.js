const { z } = require('zod');

const loginSchema = z.object({
  userId: z.string().trim().min(1),
  password: z.string().min(1),
  macaddr: z.string().optional().nullable().default(''),
  ipaddr: z.string().optional().nullable().default(''),
  source: z.string().optional().nullable().default('RW'),
  hostname: z.string().optional().nullable().default(''),
  // deptid: z.coerce.number().int().optional().default(1507),
});

module.exports = {
  loginSchema,
};
