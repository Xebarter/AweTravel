import { z } from 'zod';
import type { VehicleStatus } from '@/types/transporter-vehicle';

const statusSchema = z.enum(['active', 'maintenance', 'inactive'] satisfies [VehicleStatus, VehicleStatus, VehicleStatus]);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
  .max(32);

const optionalIsoDate = z
  .union([isoDate, z.literal(''), z.null()])
  .optional()
  .transform((v) => (v === '' || v === null || v === undefined ? undefined : v));

export const vehicleCreateSchema = z.object({
  registration: z.string().min(1).max(64),
  type: z.string().min(1).max(128),
  capacity: z.coerce.number().int().min(1).max(200),
  status: statusSchema,
  lastMaintenance: isoDate,
  mileage: z.coerce.number().int().min(0),
  acquisitionDate: isoDate,
  vin: z.string().max(64).optional().nullable(),
  color: z.string().max(64).optional().nullable(),
  fuelType: z.string().max(64).optional().nullable(),
  insurer: z.string().max(256).optional().nullable(),
  policyExpires: optionalIsoDate,
  nextInspectionDue: optionalIsoDate,
  notes: z.string().max(4000).optional().nullable(),
  wheelchairAccessible: z.boolean().optional(),
  gpsTracked: z.boolean().optional(),
});

export const vehicleUpdateSchema = vehicleCreateSchema.partial().refine((obj) => Object.keys(obj).length > 0, {
  message: 'At least one field is required',
});

export type VehicleCreateInput = z.infer<typeof vehicleCreateSchema>;
