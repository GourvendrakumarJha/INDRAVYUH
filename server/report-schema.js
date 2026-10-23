import { z } from 'zod';

export const reportCategories = ['flooding', 'road_blocked', 'infrastructure', 'waterlogging', 'embankment', 'medical', 'missing_person', 'stranded', 'other'];
const optionalNumber = (schema) => z.preprocess((value) => value === '' || value == null ? undefined : Number(value), schema.optional());
const optionalText = (schema) => z.preprocess((value) => value === '' || value == null ? undefined : value, schema.optional());
const optionalCount = optionalNumber(z.number().int().min(0).max(10000));

// Citizens describe what they observed and its human impact. Operational
// measurements and risk inputs are deliberately not part of the public schema.
const citizenFields = {
  category: z.enum(reportCategories),
  description: z.string().trim().min(10).max(1500),
  locationText: z.string().trim().min(3).max(200),
  latitude: optionalNumber(z.number().min(-90).max(90)),
  longitude: optionalNumber(z.number().min(-180).max(180)),
  observedAt: z.string().trim().max(50).refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid observation time'),
  contact: z.string().trim().max(120).optional().default(''),
  peopleCount: optionalCount,
  peopleTrapped: optionalCount,
  vulnerableCount: optionalCount,
};

const operationalMeasurementFields = {
  waterLevelCm: optionalNumber(z.number().min(0).max(1000)),
  flowVelocityMs: optionalNumber(z.number().min(0).max(30)),
  rainfall1hMm: optionalNumber(z.number().min(0).max(500)),
  rainfall24hMm: optionalNumber(z.number().min(0).max(2000)),
  riseRateCmh: optionalNumber(z.number().min(0).max(500)),
  accessCondition: optionalText(z.enum(['Open', 'Restricted', 'Blocked'])),
};

export const publicReportSchema = z.object({
  ...citizenFields,
  reporterName: z.string().trim().max(120).optional().default(''),
  consent: z.preprocess((value) => value === true || value === 'true' || value === 'on', z.literal(true)),
  isSos: z.preprocess((value) => value === true || value === 'true' || value === 'on', z.literal(false)).optional().default(false),
});

// Only the authenticated Chief Administration route uses this schema.
export const staffReportSchema = z.object({ ...citizenFields, ...operationalMeasurementFields });

export const sosSignalSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100000).optional(),
  capturedAt: z.string().trim().max(50).refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid capture time').optional(),
});

export function validateReportLocation(data, res, isInsideSupaul) {
  if ((data.latitude == null) !== (data.longitude == null)) {
    res.status(400).json({ error: 'Provide both latitude and longitude, or neither.' });
    return false;
  }
  if (data.latitude != null && !isInsideSupaul(data.latitude, data.longitude)) {
    res.status(400).json({ error: 'The selected point is outside Supaul district.', code: 'OUTSIDE_DISTRICT' });
    return false;
  }
  if (Date.parse(data.observedAt) > Date.now() + 5 * 60000) {
    res.status(400).json({ error: 'Observation time cannot be in the future.' });
    return false;
  }
  return true;
}
