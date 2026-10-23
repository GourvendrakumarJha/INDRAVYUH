import { Router } from 'express';
import { z } from 'zod';
import { db } from './db.js';
import { config } from './config.js';
import { requireAdmin } from './auth.js';
import { audit } from './audit.js';
import { now, randomToken } from './security.js';
import { asCsv, parseBody } from './validation.js';
import { riskFromRecord } from './risk.js';

export const welfareRouter = Router();
const simulated = config.demoMode ? 1 : 0;
const scope = 'simulated = ?';
const reportColumns = `id,reference,is_sos,category,description,location_text,latitude,longitude,observed_at,reporter_name,contact,people_count,people_trapped,vulnerable_count,people_assisted,
  photo_name,photo_mime,status,verification,priority,assigned_team,is_public,simulated,created_at,updated_at,gps_accuracy,gps_captured_at,source,response_stage,
  water_level_cm,flow_velocity_ms,rainfall_1h_mm,rainfall_24h_mm,rise_rate_cmh,access_condition,risk_score,risk_band,risk_confidence`;

welfareRouter.get('/overview', (_req, res) => {
  const count = (sql, ...params) => db.prepare(sql).get(...params).count;
  const stats = {
    openIncidents: count(`SELECT COUNT(*) count FROM reports WHERE ${scope} AND status NOT IN ('Resolved','Closed')`, simulated),
    awaitingReview: count(`SELECT COUNT(*) count FROM reports WHERE ${scope} AND status IN ('Submitted','Under review')`, simulated),
    sosQueue: count(`SELECT COUNT(*) count FROM reports WHERE ${scope} AND is_sos=1 AND status NOT IN ('Resolved','Closed')`, simulated),
    verified: count(`SELECT COUNT(*) count FROM reports WHERE ${scope} AND verification='Verified' AND status NOT IN ('Resolved','Closed')`, simulated),
    activeTeams: count(`SELECT COUNT(*) count FROM teams WHERE ${scope} AND status IN ('Available','Assigned','On task')`, simulated),
    lowStock: count(`SELECT COUNT(*) count FROM relief WHERE ${scope} AND quantity < min_stock`, simulated),
  };
  const shelter = db.prepare(`SELECT COALESCE(SUM(capacity),0) capacity,COALESCE(SUM(occupied),0) occupied FROM shelters WHERE ${scope}`).get(simulated);
  const recent = db.prepare(`SELECT id,reference,is_sos,category,description,location_text,status,verification,priority,assigned_team,created_at,updated_at,simulated FROM reports WHERE ${scope} ORDER BY updated_at DESC LIMIT 8`).all(simulated);
  const teams = db.prepare(`SELECT * FROM teams WHERE ${scope} ORDER BY status,name`).all(simulated);
  const specialized = db.prepare(`SELECT t.id,t.title,t.task_type,t.status,t.completion_outcome,t.result_note,t.updated_at,u.name AS employee_name,r.reference AS report_reference,d.id AS delivery_reference
    FROM employee_tasks t JOIN users u ON u.id=t.user_id LEFT JOIN reports r ON r.id=t.report_id LEFT JOIN relief_deliveries d ON d.id=t.delivery_id
    WHERE t.assigned_by IN (SELECT id FROM users WHERE portal='welfare') ORDER BY t.updated_at DESC LIMIT 8`).all();
  res.json({ stats, shelter, recent, teams, specialized, demoMode: config.demoMode, serverTime: now() });
});

welfareRouter.get('/reports', (req, res) => {
  const clauses = [scope];
  const params = [simulated];
  if (req.query.type === 'sos') clauses.push('is_sos=1');
  if (req.query.type === 'reports') clauses.push('is_sos=0');
  if (req.query.status && req.query.status !== 'all') { clauses.push('status = ?'); params.push(String(req.query.status)); }
  if (req.query.search) {
    clauses.push('(reference LIKE ? OR location_text LIKE ? OR description LIKE ?)');
    const term = `%${String(req.query.search).slice(0, 100)}%`;
    params.push(term, term, term);
  }
  const reports = db.prepare(`SELECT ${reportColumns},CASE WHEN photo_path IS NOT NULL THEN 1 ELSE 0 END AS has_photo
    FROM reports WHERE ${clauses.join(' AND ')} ORDER BY CASE priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Normal' THEN 3 ELSE 4 END, updated_at DESC LIMIT 250`).all(...params);
  res.json({ reports, demoMode: config.demoMode });
});

welfareRouter.get('/reports/:id', (req, res) => {
  const report = db.prepare(`SELECT ${reportColumns},CASE WHEN photo_path IS NOT NULL THEN 1 ELSE 0 END AS has_photo FROM reports WHERE id=? AND ${scope}`).get(req.params.id, simulated);
  if (!report) return res.status(404).json({ error: 'Record not found or not authorised.' });
  const events = db.prepare(`SELECT e.action,e.note,e.created_at,u.name AS actor_name FROM report_events e LEFT JOIN users u ON u.id=e.actor_id WHERE e.report_id=? ORDER BY e.created_at DESC`).all(report.id);
  res.json({ report, events, risk: report.risk_score == null ? null : riskFromRecord(report) });
});

const reportPatch = z.object({
  status: z.enum(['Submitted','Under review','Verified','Assigned','In progress','Resolved','Closed']).optional(),
  verification: z.enum(['Unverified','Under review','Verified','Rejected']).optional(),
  priority: z.enum(['Low','Normal','High','Critical']).optional(),
  assignedTeam: z.string().max(60).nullable().optional(),
  isPublic: z.boolean().optional(),
  note: z.string().trim().max(1000).optional(),
}).refine((data) => Object.entries(data).some(([key, value]) => key !== 'note' && value !== undefined), 'No changes supplied');

welfareRouter.patch('/reports/:id', (req, res) => {
  const data = parseBody(reportPatch, req, res);
  if (!data) return;
  const current = db.prepare(`SELECT * FROM reports WHERE id=? AND ${scope}`).get(req.params.id, simulated);
  if (!current) return res.status(404).json({ error: 'Record not found or not authorised.' });
  if (data.assignedTeam && !db.prepare(`SELECT id FROM teams WHERE id=? AND ${scope}`).get(data.assignedTeam, simulated)) return res.status(400).json({ error: 'Select a valid response team.' });
  const nextVerification = data.verification ?? current.verification;
  const nextPublic = data.isPublic ?? Boolean(current.is_public);
  if (nextPublic && (current.is_sos || nextVerification !== 'Verified')) return res.status(400).json({ error: 'Only verified, non-SOS reports may be published to the public map.' });

  const updates = [];
  const params = [];
  const mapping = { status: 'status', verification: 'verification', priority: 'priority', assignedTeam: 'assigned_team', isPublic: 'is_public' };
  for (const [key, column] of Object.entries(mapping)) {
    if (data[key] !== undefined) { updates.push(`${column}=?`); params.push(key === 'isPublic' ? (data[key] ? 1 : 0) : data[key]); }
  }
  if (current.is_sos && data.status) {
    const stage = { Submitted: 'Received', 'Under review': 'Acknowledged', Verified: 'Acknowledged', Assigned: 'Dispatched', 'In progress': 'Responding', Resolved: 'Resolved', Closed: 'Resolved' }[data.status];
    if (stage) { updates.push('response_stage=?'); params.push(stage); }
  }
  updates.push('updated_at=?');
  params.push(now(), current.id);
  const transaction = db.transaction(() => {
    db.prepare(`UPDATE reports SET ${updates.join(',')} WHERE id=?`).run(...params);
    db.prepare('INSERT INTO report_events (report_id,actor_id,action,note,created_at) VALUES (?,?,?,?,?)')
      .run(current.id, req.user.id, 'Operational update', data.note || Object.entries(data).filter(([k]) => k !== 'note').map(([k,v]) => `${k}: ${v}`).join(' · '), now());
  });
  transaction();
  audit(req, 'Updated report', 'report', current.reference, { ...data, note: undefined });
  res.json({ ok: true });
});

welfareRouter.get('/reports/:id/photo', (req, res) => {
  const report = db.prepare(`SELECT photo_path,photo_mime FROM reports WHERE id=? AND ${scope}`).get(req.params.id, simulated);
  if (!report?.photo_path) return res.status(404).json({ error: 'Attachment not found or not authorised.' });
  res.type(report.photo_mime || 'application/octet-stream');
  res.set('Content-Disposition', 'inline');
  res.set('Cache-Control', 'private, no-store');
  res.sendFile(report.photo_path);
});

welfareRouter.get('/teams', (_req, res) => {
  const teams = db.prepare(`SELECT * FROM teams WHERE ${scope} ORDER BY name`).all(simulated);
  const tasks = db.prepare(`SELECT id,reference,category,location_text,status,priority,assigned_team FROM reports WHERE ${scope} AND assigned_team IS NOT NULL AND status NOT IN ('Resolved','Closed') ORDER BY updated_at DESC`).all(simulated);
  res.json({ teams, tasks });
});
welfareRouter.patch('/teams/:id', (req, res) => {
  const data = parseBody(z.object({ status: z.enum(['Available','Assigned','En route','On task','Unavailable']) }), req, res);
  if (!data) return;
  const result = db.prepare(`UPDATE teams SET status=?,last_checkin=? WHERE id=? AND ${scope}`).run(data.status, now(), req.params.id, simulated);
  if (!result.changes) return res.status(404).json({ error: 'Team not found or not authorised.' });
  audit(req, 'Updated team status', 'team', req.params.id, data);
  res.json({ ok: true });
});

welfareRouter.get('/shelters', (_req, res) => res.json({ shelters: db.prepare(`SELECT * FROM shelters WHERE ${scope} ORDER BY area,name`).all(simulated) }));
welfareRouter.patch('/shelters/:id', (req, res) => {
  const data = parseBody(z.object({ capacity: z.number().int().min(0).max(100000), occupied: z.number().int().min(0).max(100000), status: z.string().trim().min(3).max(80), accessibility: z.string().trim().max(200) }).refine((v) => v.occupied <= v.capacity, 'Occupancy cannot exceed capacity'), req, res);
  if (!data) return;
  const result = db.prepare(`UPDATE shelters SET capacity=?,occupied=?,status=?,accessibility=?,last_confirmed=? WHERE id=? AND ${scope}`)
    .run(data.capacity, data.occupied, data.status, data.accessibility, now(), req.params.id, simulated);
  if (!result.changes) return res.status(404).json({ error: 'Shelter not found or not authorised.' });
  audit(req, 'Updated shelter', 'shelter', req.params.id, data);
  res.json({ ok: true });
});

welfareRouter.get('/relief', (_req, res) => res.json({ relief: db.prepare(`SELECT * FROM relief WHERE ${scope} ORDER BY category,item`).all(simulated) }));
welfareRouter.patch('/relief/:id', (req, res) => {
  const data = parseBody(z.object({ adjustment: z.number().min(-1000000).max(1000000).refine((v) => v !== 0), note: z.string().trim().min(3).max(300) }), req, res);
  if (!data) return;
  const item = db.prepare(`SELECT * FROM relief WHERE id=? AND ${scope}`).get(req.params.id, simulated);
  if (!item) return res.status(404).json({ error: 'Stock item not found or not authorised.' });
  const quantity = item.quantity + data.adjustment;
  if (quantity < 0) return res.status(400).json({ error: 'Stock cannot become negative.' });
  db.prepare('UPDATE relief SET quantity=?,updated_at=? WHERE id=?').run(quantity, now(), item.id);
  audit(req, 'Adjusted relief stock', 'relief', item.id, { item: item.item, before: item.quantity, after: quantity, note: data.note });
  res.json({ ok: true, quantity });
});

welfareRouter.get('/alerts', (_req, res) => res.json({ alerts: db.prepare(`SELECT * FROM alerts WHERE ${scope} ORDER BY created_at DESC`).all(simulated) }));
const alertSchema = z.object({
  titleEn: z.string().trim().min(5).max(180), titleHi: z.string().trim().min(2).max(180),
  bodyEn: z.string().trim().min(10).max(2000), bodyHi: z.string().trim().min(5).max(2000),
  area: z.string().trim().min(3).max(160), landmark: z.string().trim().max(180).optional().default(''),
  routeStatus: z.enum(['Not specified','Open','Restricted','Blocked','Under review']),
  severity: z.enum(['Information','Preparedness','Advisory','Urgent']), source: z.string().trim().min(3).max(180), publish: z.boolean().default(false),
});
welfareRouter.post('/alerts', (req, res) => {
  const data = parseBody(alertSchema, req, res);
  if (!data) return;
  if (data.publish && !req.user.role.endsWith('_admin')) return res.status(403).json({ error: 'Only a Chief Administrator can publish advisories.' });
  const timestamp = now();
  const result = db.prepare(`INSERT INTO alerts (title_en,title_hi,body_en,body_hi,severity,source,status,published_at,simulated,created_by,created_at,area,landmark,route_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(data.titleEn, data.titleHi, data.bodyEn, data.bodyHi, data.severity, data.source, data.publish ? 'Published' : 'Draft', data.publish ? timestamp : null, simulated, req.user.id, timestamp, data.area, data.landmark, data.routeStatus);
  audit(req, data.publish ? 'Published advisory' : 'Created advisory draft', 'alert', result.lastInsertRowid, { severity: data.severity });
  res.status(201).json({ id: result.lastInsertRowid });
});
welfareRouter.patch('/alerts/:id/publish', requireAdmin, (req, res) => {
  const result = db.prepare(`UPDATE alerts SET status='Published',published_at=? WHERE id=? AND ${scope}`).run(now(), req.params.id, simulated);
  if (!result.changes) return res.status(404).json({ error: 'Advisory not found or not authorised.' });
  audit(req, 'Published advisory', 'alert', req.params.id);
  res.json({ ok: true });
});

welfareRouter.get('/coordination', (_req, res) => {
  const organisations = db.prepare("SELECT id,name FROM organisations WHERE status='Active' ORDER BY name").all();
  const employees = db.prepare("SELECT id,name,role FROM users WHERE portal='employee' AND active=1 ORDER BY name").all();
  const reports = db.prepare(`SELECT id,reference,is_sos,source FROM reports WHERE ${scope} AND status NOT IN ('Resolved','Closed') ORDER BY updated_at DESC LIMIT 100`).all(simulated);
  const requests = db.prepare(`SELECT c.*,o.name AS organisation_name,r.reference AS report_reference,u.name AS created_by_name
    FROM coordination_requests c JOIN organisations o ON o.id=c.organisation_id LEFT JOIN reports r ON r.id=c.report_id LEFT JOIN users u ON u.id=c.created_by
    WHERE c.simulated=? ORDER BY c.updated_at DESC LIMIT 250`).all(simulated);
  const staffTasks = db.prepare(`SELECT t.id,t.title,t.description,t.status,t.priority,t.due_date,t.report_id,t.delivery_id,t.task_type,t.result_note,t.completion_outcome,t.completed_at,t.created_at,t.updated_at,u.name AS employee_name,r.reference AS report_reference,r.verification AS report_verification,d.destination AS delivery_destination,d.status AS delivery_status
    FROM employee_tasks t JOIN users u ON u.id=t.user_id LEFT JOIN reports r ON r.id=t.report_id LEFT JOIN relief_deliveries d ON d.id=t.delivery_id
    WHERE t.assigned_by IN (SELECT id FROM users WHERE portal='welfare') ORDER BY t.updated_at DESC LIMIT 250`).all();
  const deliveries = db.prepare(`SELECT d.id,d.destination,d.status,d.quantity,r.item,r.unit FROM relief_deliveries d JOIN relief r ON r.id=d.item_id WHERE d.simulated=? ORDER BY d.updated_at DESC LIMIT 100`).all(simulated);
  res.json({ organisations, employees, reports, requests, staffTasks, deliveries, serverTime: now() });
});

welfareRouter.post('/coordination/requests', (req, res) => {
  const data = parseBody(z.object({
    organisationId: z.string().trim().min(2).max(80), reportId: z.number().int().positive().nullable().optional(),
    title: z.string().trim().min(3).max(180), category: z.enum(['Relief supplies','Logistics','Volunteers','Technical support','Other']),
    details: z.string().trim().min(5).max(1500), priority: z.enum(['Low','Normal','High','Critical']),
  }), req, res);
  if (!data) return;
  if (!db.prepare("SELECT id FROM organisations WHERE id=? AND status='Active'").get(data.organisationId)) return res.status(400).json({ error: 'Select an active organisation.' });
  if (data.reportId && !db.prepare(`SELECT id FROM reports WHERE id=? AND ${scope}`).get(data.reportId, simulated)) return res.status(400).json({ error: 'Select a valid report.' });
  const id = `CR-${randomToken(5)}`;
  const timestamp = now();
  db.prepare(`INSERT INTO coordination_requests (id,organisation_id,report_id,title,category,details,priority,status,created_by,created_at,updated_at,simulated)
    VALUES (?,?,?,?,?,?,?,'Requested',?,?,?,?)`).run(id, data.organisationId, data.reportId ?? null, data.title, data.category, data.details, data.priority, req.user.id, timestamp, timestamp, simulated);
  audit(req, 'Sent organisation coordination request', 'coordination_request', id, { organisationId: data.organisationId, category: data.category });
  res.status(201).json({ id });
});

welfareRouter.post('/coordination/tasks', (req, res) => {
  const data = parseBody(z.object({
    employeeId: z.string().trim().min(2).max(100), reportId: z.number().int().positive().nullable().optional(),
    deliveryId: z.string().trim().max(80).nullable().optional(),
    taskType: z.enum(['general','citizen_verification','monitoring','communication','relief_supply','tracking','notification']).optional().default('general'),
    title: z.string().trim().min(3).max(180), description: z.string().trim().min(5).max(1500),
    priority: z.enum(['Low','Normal','High','Critical']), dueDate: z.string().date(),
  }), req, res);
  if (!data) return;
  if (!db.prepare("SELECT id FROM users WHERE id=? AND portal='employee' AND active=1").get(data.employeeId)) return res.status(400).json({ error: 'Select an active specialized action officer.' });
  if (['general','citizen_verification'].includes(data.taskType) && !data.reportId) return res.status(400).json({ error: 'Select a citizen report for this assignment.' });
  if (data.taskType === 'relief_supply' && !data.deliveryId) return res.status(400).json({ error: 'Select an in-transit relief delivery.' });
  if (data.taskType !== 'relief_supply' && data.deliveryId) return res.status(400).json({ error: 'A delivery link is valid only for a relief-supply assignment.' });
  const report = data.reportId ? db.prepare(`SELECT id,reference,is_sos,source FROM reports WHERE id=? AND ${scope}`).get(data.reportId, simulated) : null;
  if (data.reportId && !report) return res.status(400).json({ error: 'Select a valid report.' });
  if (data.taskType === 'citizen_verification' && (report?.is_sos || report?.source !== 'Citizen')) return res.status(400).json({ error: 'Citizen verification requires a non-SOS citizen incident report.' });
  const delivery = data.deliveryId ? db.prepare('SELECT id,status FROM relief_deliveries WHERE id=? AND simulated=?').get(data.deliveryId, simulated) : null;
  if (data.deliveryId && !delivery) return res.status(400).json({ error: 'Select a valid relief delivery.' });
  if (data.taskType === 'relief_supply' && delivery?.status !== 'In transit') return res.status(400).json({ error: 'Only an in-transit delivery can be assigned.' });
  const timestamp = now();
  const transaction = db.transaction(() => {
    const result = db.prepare(`INSERT INTO employee_tasks (user_id,title,description,status,priority,due_date,created_at,updated_at,report_id,assigned_by,task_type,delivery_id)
      VALUES (?,?,?,'To do',?,?,?,?,?,?,?,?)`).run(data.employeeId, data.title, data.description, data.priority, data.dueDate, timestamp, timestamp, data.reportId ?? null, req.user.id, data.taskType, data.deliveryId ?? null);
    if (data.reportId) db.prepare('INSERT INTO report_events (report_id,actor_id,action,note,created_at) VALUES (?,?,?,?,?)').run(data.reportId, req.user.id, data.taskType === 'general' ? 'Employee task assigned' : 'Specialized action assigned', `${data.taskType}: ${data.title}`, timestamp);
    return result.lastInsertRowid;
  });
  const id = transaction();
  audit(req, data.taskType === 'general' ? 'Assigned report-linked employee task' : 'Assigned specialized action', 'employee_task', id, { report: report?.reference, deliveryId: data.deliveryId, employeeId: data.employeeId, taskType: data.taskType });
  res.status(201).json({ id, taskType: data.taskType });
});

welfareRouter.get('/analytics', (_req, res) => {
  const categories = db.prepare(`SELECT category,COUNT(*) count FROM reports WHERE ${scope} GROUP BY category ORDER BY count DESC`).all(simulated);
  const statuses = db.prepare(`SELECT status,COUNT(*) count FROM reports WHERE ${scope} GROUP BY status ORDER BY count DESC`).all(simulated);
  const daily = db.prepare(`SELECT substr(created_at,1,10) date,COUNT(*) count FROM reports WHERE ${scope} GROUP BY date ORDER BY date DESC LIMIT 14`).all(simulated).reverse();
  const timing = db.prepare(`SELECT ROUND(AVG((julianday(updated_at)-julianday(created_at))*24),1) average_hours FROM reports WHERE ${scope} AND status IN ('Resolved','Closed')`).get(simulated);
  const verification = db.prepare(`SELECT verification,COUNT(*) count FROM reports WHERE ${scope} GROUP BY verification`).all(simulated);
  res.json({ categories, statuses, daily, timing, verification, note: 'Current coordination records; descriptive counts only.' });
});

welfareRouter.get('/export/reports.csv', requireAdmin, (req, res) => {
  const rows = db.prepare(`SELECT reference,category,location_text,status,verification,priority,assigned_team,created_at,updated_at,simulated FROM reports WHERE ${scope} ORDER BY created_at DESC`).all(simulated);
  audit(req, 'Exported de-identified report register', 'report_export', null, { rows: rows.length });
  res.type('text/csv');
  res.set('Content-Disposition', 'attachment; filename="indravyuh-report-register.csv"');
  res.send(`\uFEFF${asCsv(rows)}`);
});

welfareRouter.get('/audit', requireAdmin, (_req, res) => {
  const logs = db.prepare(`SELECT a.*,u.name AS user_name FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id WHERE a.portal='welfare' ORDER BY a.created_at DESC LIMIT 250`).all();
  res.json({ logs });
});
