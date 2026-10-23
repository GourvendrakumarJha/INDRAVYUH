import { Router } from 'express';
import { z } from 'zod';
import { db } from './db.js';
import { config } from './config.js';
import { isInsideSupaul } from './geo.js';
import { staffReportSchema, validateReportLocation } from './report-schema.js';
import { storeReport } from './report-store.js';
import { RISK_METHOD, riskFromRecord } from './risk.js';
import { audit } from './audit.js';
import { now, randomToken } from './security.js';
import { parseBody } from './validation.js';

export const welfareExtendedRouter = Router();
const simulated = config.demoMode ? 1 : 0;
const scope = 'simulated = ?';

welfareExtendedRouter.post('/reports', (req, res) => {
  const data = parseBody(staffReportSchema, req, res);
  if (!data) return;
  if (!validateReportLocation(data, res, isInsideSupaul)) return;
  try {
    const result = storeReport(data, {
      source: 'Chief Administration field report', createdBy: req.user.id, verification: 'Under review', withRisk: true,
      eventAction: 'Field report submitted', eventNote: 'Submitted by authorised Chief Administration personnel for verification and triage.',
    });
    audit(req, 'Created field report', 'report', result.reference, { category: data.category, riskScore: result.riskScore });
    res.status(201).json({ ...result, message: `Field report ${result.reference} added to the verification queue.` });
  } catch (error) {
    console.error('Staff report insert failed', error.message);
    res.status(500).json({ error: 'The field report could not be stored.' });
  }
});

const responseSchema = z.object({
  stage: z.enum(['Acknowledged', 'Dispatched', 'Responding', 'Resolved']),
  assignedTeam: z.string().trim().max(60).nullable().optional(),
  note: z.string().trim().max(500).optional().default(''),
  peopleAssisted: z.number().int().min(0).max(10000).nullable().optional(),
});

welfareExtendedRouter.post('/reports/:id/response', (req, res) => {
  const data = parseBody(responseSchema, req, res);
  if (!data) return;
  const report = db.prepare(`SELECT * FROM reports WHERE id=? AND is_sos=1 AND ${scope}`).get(req.params.id, simulated);
  if (!report) return res.status(404).json({ error: 'SOS record not found or not authorised.' });
  const current = report.response_stage || 'Received';
  const expected = { Received: 'Acknowledged', Acknowledged: 'Dispatched', Dispatched: 'Responding', Responding: 'Resolved' };
  if (expected[current] !== data.stage) return res.status(409).json({ error: `The next permitted response stage is ${expected[current] || 'none; this SOS is resolved'}.` });
  if (data.stage === 'Dispatched' && !data.assignedTeam) return res.status(400).json({ error: 'Select a response team before dispatch.' });
  if (data.assignedTeam && !db.prepare(`SELECT id FROM teams WHERE id=? AND ${scope}`).get(data.assignedTeam, simulated)) return res.status(400).json({ error: 'Select a valid response team.' });
  const status = { Acknowledged: 'Under review', Dispatched: 'Assigned', Responding: 'In progress', Resolved: 'Resolved' }[data.stage];
  const timestamp = now();
  const update = db.transaction(() => {
    db.prepare(`UPDATE reports SET response_stage=?,status=?,assigned_team=COALESCE(?,assigned_team),people_assisted=COALESCE(?,people_assisted),updated_at=? WHERE id=?`)
      .run(data.stage, status, data.assignedTeam ?? null, data.peopleAssisted ?? null, timestamp, report.id);
    if (data.assignedTeam && ['Dispatched', 'Responding'].includes(data.stage)) db.prepare(`UPDATE teams SET status=?,last_checkin=? WHERE id=? AND ${scope}`)
      .run(data.stage === 'Dispatched' ? 'En route' : 'On task', timestamp, data.assignedTeam, simulated);
    db.prepare('INSERT INTO report_events (report_id,actor_id,action,note,created_at) VALUES (?,?,?,?,?)')
      .run(report.id, req.user.id, `SOS ${data.stage}`, data.note || (data.assignedTeam ? `Response team: ${data.assignedTeam}` : `${data.stage} in the response timeline.`), timestamp);
  });
  update();
  audit(req, `SOS ${data.stage}`, 'report', report.reference, { assignedTeam: data.assignedTeam, peopleAssisted: data.peopleAssisted });
  res.json({ ok: true, stage: data.stage, status });
});

welfareExtendedRouter.get('/command', (_req, res) => {
  const one = (sql, ...params) => db.prepare(sql).get(...params);
  const all = (sql, ...params) => db.prepare(sql).all(...params);
  const shelter = one(`SELECT COALESCE(SUM(capacity),0) capacity,COALESCE(SUM(occupied),0) occupied FROM shelters WHERE ${scope}`, simulated);
  const stock = one(`SELECT COUNT(*) total,SUM(CASE WHEN quantity>=min_stock THEN 1 ELSE 0 END) ready FROM relief WHERE ${scope}`, simulated);
  const timing = one(`SELECT ROUND(AVG((julianday(updated_at)-julianday(created_at))*24),1) average_hours FROM reports WHERE ${scope} AND status IN ('Resolved','Closed')`, simulated);
  const stats = {
    activeEmergencies: one(`SELECT COUNT(*) count FROM reports WHERE is_sos=1 AND status NOT IN ('Resolved','Closed') AND ${scope}`, simulated).count,
    totalSos: one(`SELECT COUNT(*) count FROM reports WHERE is_sos=1 AND ${scope}`, simulated).count,
    totalReports: one(`SELECT COUNT(*) count FROM reports WHERE is_sos=0 AND ${scope}`, simulated).count,
    criticalZones: one(`SELECT COUNT(DISTINCT location_text) count FROM reports WHERE risk_band='Critical' AND status NOT IN ('Resolved','Closed') AND ${scope}`, simulated).count,
    peopleReached: one(`SELECT COALESCE(SUM(people_reached),0) count FROM relief_deliveries WHERE status='Delivered' AND ${scope}`, simulated).count,
    shelterOccupancy: shelter.capacity ? Math.round(shelter.occupied / shelter.capacity * 100) : 0,
    reliefReadiness: stock.total ? Math.round((stock.ready || 0) / stock.total * 100) : 0,
    responseHours: timing.average_hours,
    queuedAlerts: one(`SELECT COUNT(*) count FROM alerts WHERE status='Draft' AND ${scope}`, simulated).count,
    deliveriesInTransit: one(`SELECT COUNT(*) count FROM relief_deliveries WHERE status='In transit' AND ${scope}`, simulated).count,
    familyAssistance: one(`SELECT COUNT(*) count FROM family_checkins WHERE status='Need assistance' AND ${scope}`, simulated).count,
  };
  const dispatch = all(`SELECT r.id,r.reference,r.location_text,r.response_stage,r.status,r.priority,r.assigned_team,t.name AS team_name,t.status AS team_status
    FROM reports r LEFT JOIN teams t ON t.id=r.assigned_team WHERE r.assigned_team IS NOT NULL AND r.status NOT IN ('Resolved','Closed') AND r.simulated=?
    ORDER BY r.updated_at DESC LIMIT 12`, simulated);
  const notices = all(`SELECT e.action,e.note,e.created_at,r.reference,u.name AS actor_name FROM report_events e JOIN reports r ON r.id=e.report_id
    LEFT JOIN users u ON u.id=e.actor_id WHERE r.simulated=? ORDER BY e.created_at DESC LIMIT 10`, simulated);
  res.json({ stats, dispatch, notices });
});

welfareExtendedRouter.get('/risk-analytics', (_req, res) => {
  const reports = db.prepare(`SELECT id,reference,location_text,category,status,priority,risk_score,risk_band,risk_confidence,
    water_level_cm,flow_velocity_ms,rainfall_1h_mm,rainfall_24h_mm,rise_rate_cmh,people_count,people_trapped,vulnerable_count,access_condition,updated_at
    FROM reports WHERE risk_score IS NOT NULL AND ${scope} ORDER BY risk_score DESC,updated_at DESC LIMIT 50`).all(simulated)
    .map((record) => ({ ...record, components: riskFromRecord(record).components }));
  res.json({
    reports,
    selected: reports[0] || null,
    method: RISK_METHOD,
    note: 'Deterministic triage from submitted measurements; not a live prediction. Partial input lowers confidence.',
  });
});

welfareExtendedRouter.get('/logistics', (_req, res) => {
  const relief = db.prepare(`SELECT * FROM relief WHERE ${scope} ORDER BY category,item`).all(simulated);
  const deliveries = db.prepare(`SELECT d.*,r.item,r.unit,u.name AS created_by_name FROM relief_deliveries d JOIN relief r ON r.id=d.item_id
    LEFT JOIN users u ON u.id=d.created_by WHERE d.simulated=? ORDER BY d.updated_at DESC LIMIT 100`).all(simulated);
  const count = (sql) => db.prepare(sql).get(simulated).count;
  res.json({ relief, deliveries, metrics: {
    depots: new Set(relief.map((item) => item.location)).size,
    distributionRequests: count(`SELECT COUNT(*) count FROM relief_deliveries WHERE ${scope}`),
    criticalShortages: relief.filter((item) => item.quantity < item.min_stock).length,
    inTransit: deliveries.filter((item) => item.status === 'In transit').length,
  } });
});

const deliverySchema = z.object({
  itemId: z.number().int().positive(), quantity: z.number().positive().max(1000000),
  destination: z.string().trim().min(3).max(200), area: z.string().trim().min(3).max(160),
  peopleReached: z.number().int().min(0).max(100000).nullable().optional(),
  note: z.string().trim().min(3).max(500),
});

welfareExtendedRouter.post('/logistics/deliveries', (req, res) => {
  const data = parseBody(deliverySchema, req, res);
  if (!data) return;
  const item = db.prepare(`SELECT * FROM relief WHERE id=? AND ${scope}`).get(data.itemId, simulated);
  if (!item) return res.status(404).json({ error: 'Relief item not found or not authorised.' });
  const id = `IV-SUP-DLV-${randomToken(5).toUpperCase()}`;
  const timestamp = now();
  const create = db.transaction(() => {
    const changed = db.prepare(`UPDATE relief SET quantity=quantity-?,updated_at=? WHERE id=? AND quantity>=? AND ${scope}`)
      .run(data.quantity, timestamp, item.id, data.quantity, simulated);
    if (!changed.changes) return false;
    db.prepare(`INSERT INTO relief_deliveries (id,item_id,quantity,destination,area,people_reached,status,note,created_by,created_at,updated_at,simulated)
      VALUES (?,?,?,?,?,?,'In transit',?,?,?,?,?)`).run(id, item.id, data.quantity, data.destination, data.area, data.peopleReached ?? null, data.note, req.user.id, timestamp, timestamp, simulated);
    return true;
  });
  if (!create()) return res.status(400).json({ error: `Only ${item.quantity} ${item.unit} are available.` });
  audit(req, 'Created relief delivery', 'relief_delivery', id, { item: item.item, quantity: data.quantity, destination: data.destination });
  res.status(201).json({ id, status: 'In transit' });
});

welfareExtendedRouter.patch('/logistics/deliveries/:id', (req, res) => {
  const data = parseBody(z.object({ status: z.enum(['Delivered', 'Cancelled']) }), req, res);
  if (!data) return;
  const delivery = db.prepare(`SELECT * FROM relief_deliveries WHERE id=? AND ${scope}`).get(req.params.id, simulated);
  if (!delivery) return res.status(404).json({ error: 'Delivery not found or not authorised.' });
  if (delivery.status !== 'In transit') return res.status(409).json({ error: 'Only an in-transit delivery can be marked delivered or cancelled.' });
  const timestamp = now();
  const update = db.transaction(() => {
    db.prepare('UPDATE relief_deliveries SET status=?,updated_at=? WHERE id=?').run(data.status, timestamp, delivery.id);
    if (data.status === 'Cancelled' && delivery.status !== 'Cancelled') db.prepare('UPDATE relief SET quantity=quantity+?,updated_at=? WHERE id=?').run(delivery.quantity, timestamp, delivery.item_id);
  });
  update();
  audit(req, 'Updated relief delivery', 'relief_delivery', delivery.id, { before: delivery.status, after: data.status });
  res.json({ ok: true });
});

welfareExtendedRouter.get('/family-safety', (_req, res) => {
  const checkins = db.prepare(`SELECT f.id,f.reference,f.name,f.status,f.area,f.shelter_id,f.note,f.contact,f.created_at,f.updated_at,s.name AS shelter_name
    FROM family_checkins f LEFT JOIN shelters s ON s.id=f.shelter_id WHERE f.simulated=? ORDER BY f.updated_at DESC LIMIT 250`).all(simulated);
  res.json({ checkins });
});

welfareExtendedRouter.patch('/family-safety/:id', (req, res) => {
  const data = parseBody(z.object({
    status: z.enum(['Safe', 'At shelter', 'Need assistance']).optional(), area: z.string().trim().min(3).max(160).optional(),
    shelterId: z.string().trim().max(80).nullable().optional(), note: z.string().trim().max(500).optional(),
  }).refine((value) => Object.values(value).some((item) => item !== undefined)), req, res);
  if (!data) return;
  const current = db.prepare(`SELECT * FROM family_checkins WHERE id=? AND ${scope}`).get(req.params.id, simulated);
  if (!current) return res.status(404).json({ error: 'Family check-in not found or not authorised.' });
  if (data.shelterId && !db.prepare(`SELECT id FROM shelters WHERE id=? AND ${scope}`).get(data.shelterId, simulated)) return res.status(400).json({ error: 'Select a valid shelter.' });
  db.prepare(`UPDATE family_checkins SET status=?,area=?,shelter_id=?,note=?,updated_at=? WHERE id=?`)
    .run(data.status ?? current.status, data.area ?? current.area, data.shelterId === undefined ? current.shelter_id : data.shelterId, data.note ?? current.note, now(), current.id);
  audit(req, 'Updated family check-in', 'family_checkin', current.reference, { status: data.status ?? current.status });
  res.json({ ok: true });
});
