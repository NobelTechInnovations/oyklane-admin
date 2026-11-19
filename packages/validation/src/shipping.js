const { z } = require("zod");

const createShippingZoneSchema = z.object({
  name: z.string().min(1, "Name is required"),
  countries: z.string().min(1, "At least one country code is required"), // comma-separated, e.g. "IN,US"
});

const updateShippingZoneSchema = createShippingZoneSchema.partial();

const createShippingRateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.coerce.number().nonnegative(),
  freeAbove: z.coerce.number().nonnegative().optional().nullable(),
  // Weight-based rates (grams): only for parcels in this range, plus a price per kg.
  minWeightGrams: z.coerce.number().int().nonnegative().optional().nullable(),
  maxWeightGrams: z.coerce.number().int().positive().optional().nullable(),
  perKg: z.coerce.number().nonnegative().optional().nullable(),
});

const updateShippingRateSchema = createShippingRateSchema.partial();

module.exports = {
  createShippingZoneSchema,
  updateShippingZoneSchema,
  createShippingRateSchema,
  updateShippingRateSchema,
};
