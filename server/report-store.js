import { db } from './db.js';
import { config } from './config.js';
import { calculateRisk, riskColumns } from './risk.js';
import { now, referenceCode, sha256, trackingCode } from './security.js';

const riskKeys = Object.keys(riskColumns({}));

export function storeReport(data, options = {}) {
  const isSos = Boolean(options.isSos);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const reference = referenceCode(isSos);
    const accessCode = trackingCode();
    const timestamp = now();
    // Only an authenticated Chief Administration field report may calculate
    // operational risk. Citizen reports retain human-impact details but never
    // accept or infer water/weather/access measurements.
    const risk = options.withRisk ? calculateRisk(data) : calculateRisk({});
    const operationalColumns = options.withRisk ? riskColumns(data) : {
      ...riskColumns({}),
      people_trapped: data.peopleTrapped ?? null,
      vulnerable_count: data.vulnerableCount ?? null,
    };
    const priority = options.priority || (isSos ? 'Critical' : risk.riskBand === 'Critical' ? 'Critical' : risk.riskBand === 'High' ? 'High' : 'Normal');
    const values = {
      reference,
      trackingHash: sha256(accessCode),
      isSos: isSos ? 1 : 0,
      category: data.category || 'other',
      description: data.description,
      locationText: data.locationText,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      observedAt: new Date(data.observedAt || timestamp).toISOString(),
      reporterName: data.reporterName || '',
      contact: data.contact || '',
      peopleCount: data.peopleCount ?? null,
      photoPath: options.photo?.path || null,
      photoName: options.photo?.originalname?.slice(0, 180) || null,
      photoMime: options.photo?.mimetype || null,
      status: options.status || 'Submitted',
      verification: options.verification || 'Unverified',
      priority,
      simulated: config.demoMode ? 1 : 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      gpsAccuracy: options.gpsAccuracy ?? null,
      gpsCapturedAt: options.gpsCapturedAt || null,
      source: options.source || 'Citizen',
      createdBy: options.createdBy || null,
      responseStage: isSos ? 'Received' : null,
      ...operationalColumns,
    };
    try {
      const insert = db.transaction(() => {
        const result = db.prepare(`INSERT INTO reports (
          reference,tracking_hash,is_sos,category,description,location_text,latitude,longitude,observed_at,reporter_name,contact,people_count,
          photo_path,photo_name,photo_mime,status,verification,priority,simulated,created_at,updated_at,
          gps_accuracy,gps_captured_at,source,created_by,response_stage,${riskKeys.join(',')}
        ) VALUES (
          @reference,@trackingHash,@isSos,@category,@description,@locationText,@latitude,@longitude,@observedAt,@reporterName,@contact,@peopleCount,
          @photoPath,@photoName,@photoMime,@status,@verification,@priority,@simulated,@createdAt,@updatedAt,
          @gpsAccuracy,@gpsCapturedAt,@source,@createdBy,@responseStage,${riskKeys.map((key) => `@${key}`).join(',')}
        )`).run(values);
        db.prepare('INSERT INTO report_events (report_id,actor_id,action,note,created_at) VALUES (?,?,?,?,?)')
          .run(result.lastInsertRowid, values.createdBy, options.eventAction || (isSos ? 'SOS received' : 'Report submitted'), options.eventNote || 'Awaiting authorised review.', timestamp);
        return result.lastInsertRowid;
      });
      const id = insert();
      return { id, reference, serialNumber: reference, accessCode, status: values.status, responseStage: values.responseStage, riskScore: risk.riskScore, riskBand: risk.riskBand, createdAt: timestamp };
    } catch (error) {
      if (String(error.code).includes('SQLITE_CONSTRAINT') && attempt < 3) continue;
      throw error;
    }
  }
  throw new Error('Unable to allocate a unique report reference.');
}
