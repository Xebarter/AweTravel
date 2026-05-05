import { z } from 'zod';
import {
  VEHICLE_CLASS_OPTIONS,
  type RouteStatus,
  type DepartureStatus,
} from '@/types/transporter-route';

const routeStatusSchema = z.enum(['active', 'paused', 'archived'] satisfies [
  RouteStatus,
  RouteStatus,
  RouteStatus,
]);

const departureStatusSchema = z.enum(['active', 'paused'] satisfies [
  DepartureStatus,
  DepartureStatus,
]);

const uuidSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    'Expected UUID',
  );

const optionalUuid = z
  .union([uuidSchema, z.literal(''), z.null()])
  .optional()
  .transform((v) => (v === '' || v === null || v === undefined ? undefined : v));

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:MM (24-hour)');

const vehicleClassSchema = z.enum(
  VEHICLE_CLASS_OPTIONS as unknown as [string, ...string[]],
);

const routeStopSchema = z.object({
  id: uuidSchema.optional(),
  position: z.coerce.number().int().min(0).max(64),
  name: z.string().trim().min(1, 'Stop name is required').max(128),
  etaOffsetMinutes: z.coerce.number().int().min(0).max(10080).optional(),
});

const routeDepartureSchema = z.object({
  id: uuidSchema.optional(),
  vehicleId: optionalUuid,
  departureTime: timeSchema,
  daysOfWeek: z.coerce
    .number()
    .int()
    .min(1, 'Pick at least one day of the week')
    .max(127),
  status: departureStatusSchema,
  priceOverrideMinor: z.coerce.number().int().min(0).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const routeCreateSchema = z
  .object({
    routeCode: z.string().trim().min(2, 'Route code is too short').max(32),
    origin: z.string().trim().min(1, 'Origin is required').max(128),
    destination: z.string().trim().min(1, 'Destination is required').max(128),
    distanceKm: z.coerce.number().min(0.1, 'Distance must be greater than zero').max(100000),
    durationMinutes: z.coerce
      .number()
      .int()
      .min(1, 'Duration must be at least 1 minute')
      .max(10080),
    vehicleClass: vehicleClassSchema,
    basePriceMinor: z.coerce.number().int().min(0).default(0),
    currency: z.string().trim().min(3).max(8).default('UGX'),
    status: routeStatusSchema.default('active'),
    notes: z.string().max(4000).optional().nullable(),
    stops: z.array(routeStopSchema).max(64).default([]),
    departures: z
      .array(routeDepartureSchema)
      .min(1, 'Add at least one departure so this route can run')
      .max(64),
  })
  .refine((v) => v.origin.trim().toLowerCase() !== v.destination.trim().toLowerCase(), {
    message: 'Origin and destination must be different',
    path: ['destination'],
  });

export const routeUpdateSchema = routeCreateSchema
  .innerType()
  .partial()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one field is required',
  });

export type RouteCreateInput = z.infer<typeof routeCreateSchema>;
export type RouteUpdateInput = z.infer<typeof routeUpdateSchema>;
export type RouteStopInput = z.infer<typeof routeStopSchema>;
export type RouteDepartureInput = z.infer<typeof routeDepartureSchema>;
