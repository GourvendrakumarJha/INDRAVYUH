import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { z } from 'zod';
import { db } from './db.js';
import { config } from './config.js';
import { isInsideSupaul, SUPAUL_BOUNDS } from './geo.js';
import { now, sha256, trackingCode } from './security.js';
import { publicReportSchema, sosSignalSchema, validateReportLocation } from './report-schema.js';
import { storeReport } from './report-store.js';

export const publicRouter = Router();
const simulated = config.demoMode ? 1 : 0;

const publicAlerts = () => db.prepare(`SELECT id,title_en,title_hi,body_en,body_hi,severity,source,published_at,expires_at,simulated,area,landmark,route_status
  FROM alerts WHERE status='Published' AND simulated=? ORDER BY published_at DESC LIMIT 20`).all(simulated);
const publicShelters = () => db.prepare(`SELECT id,name,area,latitude,longitude,address,capacity,occupied,status,accessibility,source,last_confirmed,simulated
  FROM shelters WHERE simulated=? ORDER BY area,name`).all(simulated);
const publicIncidents = () => db.prepare(`SELECT reference,category,location_text,ROUND(latitude,2) AS latitude,ROUND(longitude,2) AS longitude,status,updated_at,simulated,risk_score,risk_band
  FROM reports WHERE simulated=? AND is_public=1 AND is_sos=0 AND verification='Verified' AND latitude IS NOT NULL
  ORDER BY updated_at DESC LIMIT 100`).all(simulated);

publicRouter.get('/bootstrap', (_req, res) => {
  const count = (sql) => db.prepare(sql).get(simulated).count;
  res.json({
    demoMode: config.demoMode,
    district: { name: 'Supaul', state: 'Bihar', bounds: SUPAUL_BOUNDS, source: 'OpenStreetMap contributors · ODbL 1.0' },
    stats: {
      sosSignals: count('SELECT COUNT(*) count FROM reports WHERE is_sos=1 AND simulated=?'),
      citizenReports: count("SELECT COUNT(*) count FROM reports WHERE is_sos=0 AND source='Citizen' AND simulated=?"),
      publishedAlerts: count("SELECT COUNT(*) count FROM alerts WHERE status='Published' AND simulated=?"),
      listedShelters: count('SELECT COUNT(*) count FROM shelters WHERE simulated=?'),
    },
    alerts: publicAlerts(), shelters: publicShelters(), incidents: publicIncidents(), serverTime: now(),
  });
});
publicRouter.get('/alerts', (_req, res) => res.json({ alerts: publicAlerts(), demoMode: config.demoMode }));
publicRouter.get('/shelters', (_req, res) => res.json({ shelters: publicShelters(), demoMode: config.demoMode }));
publicRouter.get('/map-data', (_req, res) => res.json({ incidents: publicIncidents(), shelters: publicShelters(), bounds: SUPAUL_BOUNDS, demoMode: config.demoMode }));

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(config.dataDir, 'uploads'),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${path.extname(file.originalname).toLowerCase().slice(0, 8)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 40 },
  fileFilter: (_req, file, cb) => cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)),
});

publicRouter.post('/sos', (req, res) => {
  const parsed = sosSignalSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'A current GPS position is required to send SOS.', code: 'GPS_REQUIRED' });
  const data = parsed.data;
  if (!isInsideSupaul(data.latitude, data.longitude)) return res.status(400).json({ error: 'The GPS position is outside Supaul district.', code: 'OUTSIDE_DISTRICT' });
  const capturedAt = data.capturedAt ? new Date(data.capturedAt).toISOString() : now();
  if (Date.parse(capturedAt) > Date.now() + 5 * 60000) return res.status(400).json({ error: 'GPS capture time cannot be in the future.' });
  try {
    const result = storeReport({
      category: 'other', description: 'One-press GPS assistance request.', locationText: 'GPS origin · Supaul district',
      latitude: data.latitude, longitude: data.longitude, observedAt: capturedAt,
    }, {
      isSos: true, source: 'One-press GPS SOS', gpsAccuracy: data.accuracy ?? null, gpsCapturedAt: capturedAt,
      eventAction: 'SOS received', eventNote: 'One-press GPS signal; origin coordinates retained in the restricted record.',
    });
    res.status(201).json({
      ...result,
      coordinates: { latitude: data.latitude, longitude: data.longitude, accuracy: data.accuracy ?? null },
      capturedAt,
      demoMode: config.demoMode,
      message: 'SOS stored in the restricted Chief Administration queue. Save the serial and private tracking code.',
    });
  } catch (error) {
    console.error('SOS insert failed', error);
    res.status(500).json({ error: 'The SOS could not be stored. Please retry or submit a citizen report with the available details.' });
  }
});

publicRouter.post('/reports', upload.single('photo'), (req, res) => {
  const discardPhoto = () => { if (req.file?.path) fs.unlink(req.file.path, () => {}); };
  const parsed = publicReportSchema.safeParse(req.body);
  if (!parsed.success) {
    discardPhoto();
    return res.status(400).json({ error: 'Please review the required fields. Coordinates must be numeric and consent is required.', details: parsed.error.issues.map((issue) => issue.path.join('.')), code: 'VALIDATION_ERROR' });
  }
  const data = parsed.data;
  if (!validateReportLocation(data, res, isInsideSupaul)) { discardPhoto(); return; }
  try {
    const result = storeReport(data, { photo: req.file, source: 'Citizen' });
    res.status(201).json({
      ...result, demoMode: config.demoMode,
      message: 'Report stored. Save your tracking codes to check its status.',
    });
  } catch (error) {
    discardPhoto(); console.error('Report insert failed', error);
    res.status(500).json({ error: 'The report could not be stored. Please retry.' });
  }
});

publicRouter.get('/track', (req, res) => {
  const reference = String(req.query.reference || '').trim().toUpperCase();
  const accessCode = String(req.query.accessCode || '').trim().toUpperCase();
  if (reference.length < 8 || reference.length > 40 || accessCode.length < 8 || accessCode.length > 80) return res.status(400).json({ error: 'Enter the reference and private access code.' });
  const report = db.prepare('SELECT * FROM reports WHERE reference = ? AND simulated = ?').get(reference, simulated);
  if (!report || report.tracking_hash !== sha256(accessCode)) return res.status(404).json({ error: 'No report matched those details. Check both codes and try again.' });
  res.json({
    report: {
      reference: report.reference, category: report.category, isSos: Boolean(report.is_sos), status: report.status,
      verification: report.verification, responseStage: report.response_stage, locationText: report.location_text,
      createdAt: report.created_at, updatedAt: report.updated_at, simulated: Boolean(report.simulated),
    },
    message: 'Status information only. Submission or verification does not mean assistance has been dispatched.',
  });
});

const familySchema = z.object({
  name: z.string().trim().min(2).max(120),
  status: z.enum(['Safe', 'At shelter', 'Need assistance']),
  area: z.string().trim().min(3).max(160),
  shelterId: z.preprocess((value) => value === '' || value == null ? undefined : value, z.string().trim().max(80).optional()),
  note: z.string().trim().max(500).optional().default(''),
  contact: z.string().trim().max(120).optional().default(''),
  consent: z.literal(true),
});

publicRouter.post('/family-checkins', (req, res) => {
  const parsed = familySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter the check-in details and confirm consent.', code: 'VALIDATION_ERROR' });
  const data = parsed.data;
  if (data.shelterId && !db.prepare(`SELECT id FROM shelters WHERE id=? AND ${config.demoMode ? 'simulated=1' : 'simulated=0'}`).get(data.shelterId)) return res.status(400).json({ error: 'Select a listed shelter or leave it blank.' });
  const reference = `IV-SUP-FAM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const accessCode = trackingCode();
  const timestamp = now();
  try {
    db.prepare(`INSERT INTO family_checkins (reference,access_hash,name,status,area,shelter_id,note,contact,simulated,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(reference, sha256(accessCode), data.name, data.status, data.area, data.shelterId || null, data.note, data.contact, simulated, timestamp, timestamp);
    res.status(201).json({ reference, accessCode, status: data.status, message: 'Family check-in saved. Share both codes only with people who need this status.' });
  } catch (error) {
    console.error('Family check-in failed', error.message);
    res.status(500).json({ error: 'The check-in could not be saved. Please retry.' });
  }
});

publicRouter.get('/family-safety', (req, res) => {
  const reference = String(req.query.reference || '').trim().toUpperCase();
  const accessCode = String(req.query.accessCode || '').trim().toUpperCase();
  if (reference.length < 8 || reference.length > 40 || accessCode.length < 8 || accessCode.length > 80) return res.status(400).json({ error: 'Enter the family reference and private access code.' });
  const record = db.prepare(`SELECT f.*,s.name AS shelter_name FROM family_checkins f LEFT JOIN shelters s ON s.id=f.shelter_id WHERE f.reference=? AND f.simulated=?`).get(reference, simulated);
  if (!record || record.access_hash !== sha256(accessCode)) return res.status(404).json({ error: 'No family check-in matched those details.' });
  res.json({ checkin: { reference: record.reference, name: record.name, status: record.status, area: record.area, shelterName: record.shelter_name, note: record.note, updatedAt: record.updated_at } });
});
