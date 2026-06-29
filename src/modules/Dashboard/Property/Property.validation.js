const { z } = require('zod');

const getTilesDataQuerySchema = z.object({
  // Optional filters for DMA Dashboard
  // ulbId: z.coerce.number().int().positive().optional(),
}).passthrough();

const getModewiseCollectionQuerySchema = z.object({
  // Optional filters for DMA Dashboard
  // ulbId: z.coerce.number().int().positive().optional(),
}).passthrough();

const getPropertySummaryQuerySchema = z.object({
  // Optional filters for DMA Dashboard
  // ulbId: z.coerce.number().int().positive().optional(),
}).passthrough();

const getCollectioninPerctQuerySchema = z.object({
  // Optional filters for DMA Dashboard
  // ulbId: z.coerce.number().int().positive().optional(),
}).passthrough();

const getTotalPerfCorpbyCollSchema = z.object({
  // Optional filters for DMA Dashboard
  // ulbId: z.coerce.number().int().positive().optional(),
}).passthrough();

const getTotalPerfCorpCollectionSchema = z.object({
  // Optional filters for DMA Dashboard
  // ulbId: z.coerce.number().int().positive().optional(),
}).passthrough();

const getTodaysCollectionSchema = z.object({
  // Optional filters for DMA Dashboard
  // ulbId: z.coerce.number().int().positive().optional(),
}).passthrough();

module.exports = {
  getTilesDataQuerySchema, getModewiseCollectionQuerySchema,getPropertySummaryQuerySchema, getCollectioninPerctQuerySchema,
  getTotalPerfCorpbyCollSchema, getTotalPerfCorpCollectionSchema, getTodaysCollectionSchema
};
