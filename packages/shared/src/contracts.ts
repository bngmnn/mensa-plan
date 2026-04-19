import { z } from "zod";

export const audienceSchema = z.enum(["students", "staff", "guests"]);

export const locationSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  subtitle: z.string(),
  sourceUrl: z.string().url(),
});

export const indicatorSchema = z.object({
  label: z.string(),
  description: z.string().optional(),
  iconUrl: z.string().url().optional(),
});

export const allergenSchema = z.object({
  code: z.string(),
  label: z.string(),
});

export const priceSchema = z.object({
  audience: audienceSchema,
  amount: z.number().nonnegative(),
  currency: z.literal("EUR"),
});

export const sustainabilityMetricSchema = z.object({
  label: z.string(),
  rating: z.number().int().min(0).max(3),
  value: z.string().optional(),
});

export const dishSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  indicators: z.array(indicatorSchema),
  allergens: z.array(allergenSchema),
  prices: z.array(priceSchema),
  sustainability: z.array(sustainabilityMetricSchema),
});

export const menuCategorySchema = z.object({
  name: z.string(),
  dishes: z.array(dishSchema),
});

export const menuResponseSchema = z.object({
  location: locationSchema,
  serviceDate: z.string(),
  fetchedAt: z.string(),
  sourceUrl: z.string().url(),
  isStale: z.boolean(),
  warnings: z.array(z.string()),
  categories: z.array(menuCategorySchema),
  stats: z.object({
    totalCategories: z.number().int().nonnegative(),
    totalDishes: z.number().int().nonnegative(),
  }),
});

export const dayMenuSchema = z.object({
  serviceDate: z.string(),
  categories: z.array(menuCategorySchema),
  stats: z.object({
    totalCategories: z.number().int().nonnegative(),
    totalDishes: z.number().int().nonnegative(),
  }),
});

export const weekMenuResponseSchema = z.object({
  location: locationSchema,
  fetchedAt: z.string(),
  sourceUrl: z.string().url(),
  isStale: z.boolean(),
  warnings: z.array(z.string()),
  days: z.array(dayMenuSchema),
});

export const locationsResponseSchema = z.object({
  locations: z.array(locationSchema),
});

export const healthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  checkedAt: z.string(),
  details: z
    .object({
      source: z.string(),
      cache: z.enum(["warm", "stale", "empty"]),
    })
    .optional(),
});

export type Audience = z.infer<typeof audienceSchema>;
export type Location = z.infer<typeof locationSchema>;
export type Indicator = z.infer<typeof indicatorSchema>;
export type Allergen = z.infer<typeof allergenSchema>;
export type Price = z.infer<typeof priceSchema>;
export type SustainabilityMetric = z.infer<typeof sustainabilityMetricSchema>;
export type Dish = z.infer<typeof dishSchema>;
export type MenuCategory = z.infer<typeof menuCategorySchema>;
export type MenuResponse = z.infer<typeof menuResponseSchema>;
export type DayMenu = z.infer<typeof dayMenuSchema>;
export type WeekMenuResponse = z.infer<typeof weekMenuResponseSchema>;
export type LocationsResponse = z.infer<typeof locationsResponseSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
