import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from './db.js';
import { config } from './config.js';
import { requireAdmin } from './auth.js';
import { audit } from './audit.js';
import { now, randomToken } from './security.js';
import { parseBody } from './validation.js';

export const businessRouter = Router();
const orgId = (req) => req.user.organisation_id;
const requireOrganisation = (req, res, next) => orgId(req) ? next() : res.status(403).json({ error: 'No organisation is attached to this account.' });
businessRouter.use(requireOrganisation);
const simulated = config.demoMode ? 1 : 0;

businessRouter.get('/overview', (req, res) => {
  const organisation = db.prepare('SELECT * FROM organisations WHERE id=?').get(orgId(req));
  const openTickets = db.prepare("SELECT COUNT(*) count FROM tickets WHERE organisation_id=? AND status NOT IN ('Resolved','Closed')").get(orgId(req)).count;
  const tasks = db.prepare('SELECT status,COUNT(*) count FROM implementation_tasks WHERE organisation_id=? GROUP BY status').all(orgId(req));
  const invoices = db.prepare('SELECT * FROM invoices WHERE organisation_id=? ORDER BY issued_at DESC LIMIT 4').all(orgId(req));
  const recentTickets = db.prepare('SELECT * FROM tickets WHERE organisation_id=? ORDER BY updated_at DESC LIMIT 4').all(orgId(req));
  const members = db.prepare('SELECT COUNT(*) count FROM users WHERE organisation_id=? AND active=1').get(orgId(req)).count;
  const openCoordination = db.prepare("SELECT COUNT(*) count FROM coordination_requests WHERE organisation_id=? AND simulated=? AND status NOT IN ('Completed','Declined')").get(orgId(req), simulated).count;
  res.json({ organisation, openTickets, tasks, invoices, recentTickets, members, openCoordination });
});

businessRouter.get('/organisation', (req, res) => {
  res.json({ organisation: db.prepare('SELECT * FROM organisations WHERE id=?').get(orgId(req)) });
});
businessRouter.patch('/organisation', requireAdmin, (req, res) => {
  const data = parseBody(z.object({ name: z.string().trim().min(3).max(160), address: z.string().trim().max(300), contactEmail: z.string().trim().email().max(180) }), req, res);
  if (!data) return;
  db.prepare('UPDATE organisations SET name=?,address=?,contact_email=? WHERE id=?').run(data.name, data.address, data.contactEmail, orgId(req));
  audit(req, 'Updated organisation profile', 'organisation', orgId(req), { contactEmail: data.contactEmail });
  res.json({ ok: true });
});

businessRouter.get('/members', (req, res) => {
  const members = db.prepare('SELECT id,login_id,name,role,job_title,department,active,last_login_at,created_at FROM users WHERE organisation_id=? ORDER BY name').all(orgId(req));
  res.json({ members });
});
businessRouter.post('/members', requireAdmin, (req, res) => {
  const data = parseBody(z.object({ loginId: z.string().trim().min(4).max(60).regex(/^[A-Za-z0-9_.-]+$/), name: z.string().trim().min(2).max(120), jobTitle: z.string().trim().max(120), password: z.string().min(12).max(200) }), req, res);
  if (!data) return;
  const id = `user-${randomToken(8)}`;
  try {
    db.prepare("INSERT INTO users (id,login_id,password_hash,name,role,portal,organisation_id,job_title,department,created_at) VALUES (?,?,?,?, 'business_member','business',?,?,?,?)")
      .run(id, data.loginId, bcrypt.hashSync(data.password, 12), data.name, orgId(req), data.jobTitle, 'Business', now());
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) return res.status(409).json({ error: 'That login ID is already in use.' });
    throw error;
  }
  audit(req, 'Added organisation member', 'user', id, { loginId: data.loginId });
  res.status(201).json({ id });
});
businessRouter.patch('/members/:id', requireAdmin, (req, res) => {
  const data = parseBody(z.object({ active: z.boolean() }), req, res);
  if (!data) return;
  if (req.params.id === req.user.id && !data.active) return res.status(400).json({ error: 'You cannot deactivate your own active session.' });
  const result = db.prepare('UPDATE users SET active=? WHERE id=? AND organisation_id=?').run(data.active ? 1 : 0, req.params.id, orgId(req));
  if (!result.changes) return res.status(404).json({ error: 'Member not found or not authorised.' });
  if (!data.active) db.prepare('DELETE FROM sessions WHERE user_id=?').run(req.params.id);
  audit(req, data.active ? 'Activated member' : 'Deactivated member', 'user', req.params.id);
  res.json({ ok: true });
});

businessRouter.get('/invoices', (req, res) => res.json({ invoices: db.prepare('SELECT * FROM invoices WHERE organisation_id=? ORDER BY issued_at DESC').all(orgId(req)) }));
businessRouter.get('/implementation', (req, res) => res.json({ tasks: db.prepare('SELECT * FROM implementation_tasks WHERE organisation_id=? ORDER BY due_date').all(orgId(req)) }));
businessRouter.patch('/implementation/:id', (req, res) => {
  const data = parseBody(z.object({ status: z.enum(['Not started','In progress','Blocked','Completed']) }), req, res);
  if (!data) return;
  const result = db.prepare('UPDATE implementation_tasks SET status=?,completed_at=? WHERE id=? AND organisation_id=?')
    .run(data.status, data.status === 'Completed' ? now() : null, req.params.id, orgId(req));
  if (!result.changes) return res.status(404).json({ error: 'Task not found or not authorised.' });
  audit(req, 'Updated implementation task', 'implementation_task', req.params.id, data);
  res.json({ ok: true });
});

businessRouter.get('/tickets', (req, res) => res.json({ tickets: db.prepare(`SELECT t.*,u.name AS created_by_name FROM tickets t LEFT JOIN users u ON u.id=t.created_by WHERE t.organisation_id=? ORDER BY t.updated_at DESC`).all(orgId(req)) }));
businessRouter.post('/tickets', (req, res) => {
  const data = parseBody(z.object({ subject: z.string().trim().min(5).max(180), body: z.string().trim().min(10).max(2000), category: z.enum(['Technical','Guidance','Billing','Implementation','Other']), priority: z.enum(['Low','Normal','High']) }), req, res);
  if (!data) return;
  const result = db.prepare('INSERT INTO tickets (organisation_id,subject,body,category,priority,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(orgId(req), data.subject, data.body, data.category, data.priority, req.user.id, now(), now());
  audit(req, 'Created support ticket', 'ticket', result.lastInsertRowid, { category: data.category });
  res.status(201).json({ id: result.lastInsertRowid });
});
businessRouter.patch('/tickets/:id', (req, res) => {
  const data = parseBody(z.object({ status: z.enum(['Open','In progress','Waiting for customer','Resolved','Closed']) }), req, res);
  if (!data) return;
  const result = db.prepare('UPDATE tickets SET status=?,updated_at=? WHERE id=? AND organisation_id=?').run(data.status, now(), req.params.id, orgId(req));
  if (!result.changes) return res.status(404).json({ error: 'Ticket not found or not authorised.' });
  audit(req, 'Updated support ticket', 'ticket', req.params.id, data);
  res.json({ ok: true });
});

businessRouter.get('/coordination', (req, res) => {
  const requests = db.prepare(`SELECT c.id,c.title,c.category,c.details,c.priority,c.status,c.created_at,c.updated_at,r.reference AS report_reference,u.name AS created_by_name
    FROM coordination_requests c LEFT JOIN reports r ON r.id=c.report_id LEFT JOIN users u ON u.id=c.created_by
    WHERE c.organisation_id=? AND c.simulated=? ORDER BY c.updated_at DESC LIMIT 250`).all(orgId(req), simulated);
  res.json({ requests });
});
businessRouter.patch('/coordination/:id', (req, res) => {
  const data = parseBody(z.object({ status: z.enum(['Requested','Accepted','In progress','Completed','Declined']) }), req, res);
  if (!data) return;
  const result = db.prepare('UPDATE coordination_requests SET status=?,updated_by=?,updated_at=? WHERE id=? AND organisation_id=? AND simulated=?')
    .run(data.status, req.user.id, now(), req.params.id, orgId(req), simulated);
  if (!result.changes) return res.status(404).json({ error: 'Coordination request not found or not authorised.' });
  audit(req, 'Updated coordination request', 'coordination_request', req.params.id, data);
  res.json({ ok: true });
});

businessRouter.get('/analytics', (req, res) => {
  const implementation = db.prepare('SELECT status,COUNT(*) count FROM implementation_tasks WHERE organisation_id=? GROUP BY status').all(orgId(req));
  const support = db.prepare('SELECT status,COUNT(*) count FROM tickets WHERE organisation_id=? GROUP BY status').all(orgId(req));
  const billing = db.prepare("SELECT status,COUNT(*) count,SUM(amount) amount FROM invoices WHERE organisation_id=? GROUP BY status").all(orgId(req));
  const memberActivity = db.prepare('SELECT COUNT(*) total,SUM(CASE WHEN last_login_at IS NOT NULL THEN 1 ELSE 0 END) signed_in FROM users WHERE organisation_id=? AND active=1').get(orgId(req));
  res.json({ implementation, support, billing, memberActivity, note: 'Metrics cover only your organisation’s own service records.' });
});

businessRouter.get('/audit', requireAdmin, (req, res) => {
  const logs = db.prepare(`SELECT a.*,u.name AS user_name FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id
    WHERE a.portal='business' AND a.user_id IN (SELECT id FROM users WHERE organisation_id=?) ORDER BY a.created_at DESC LIMIT 250`).all(orgId(req));
  res.json({ logs });
});
