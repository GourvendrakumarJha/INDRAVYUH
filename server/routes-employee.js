import { Router } from 'express';
import { z } from 'zod';
import { db } from './db.js';
import { config } from './config.js';
import { requireAdmin } from './auth.js';
import { audit } from './audit.js';
import { now, safeUser } from './security.js';
import { parseBody } from './validation.js';

export const employeeRouter = Router();
const simulated = config.demoMode ? 1 : 0;
export const SPECIALIZED_TASK_TYPES = ['general', 'citizen_verification', 'monitoring', 'communication', 'relief_supply', 'tracking', 'notification'];

const taskColumns = `t.*,r.reference AS report_reference,r.verification AS report_verification,r.source AS report_source,
  CASE WHEN t.task_type='citizen_verification' THEN r.location_text END AS verification_location,
  CASE WHEN t.task_type='citizen_verification' THEN r.description END AS verification_description,
  CASE WHEN t.task_type='citizen_verification' THEN r.category END AS verification_category,
  d.destination AS delivery_destination,d.status AS delivery_status,d.quantity AS delivery_quantity,
  ri.item AS relief_item,ri.unit AS relief_unit`;
const taskJoins = `FROM employee_tasks t
  LEFT JOIN reports r ON r.id=t.report_id
  LEFT JOIN relief_deliveries d ON d.id=t.delivery_id
  LEFT JOIN relief ri ON ri.id=d.item_id`;
const ownTasks = (userId, limit = '') => db.prepare(`SELECT ${taskColumns} ${taskJoins} WHERE t.user_id=? ORDER BY CASE t.status WHEN 'In progress' THEN 1 WHEN 'To do' THEN 2 WHEN 'Blocked' THEN 3 ELSE 4 END,t.due_date,t.updated_at DESC ${limit}`).all(userId);

employeeRouter.get('/overview', (req, res) => {
  const tasks = ownTasks(req.user.id, 'LIMIT 6');
  const notices = db.prepare("SELECT * FROM notices WHERE audience IN ('employee','all') ORDER BY created_at DESC LIMIT 5").all();
  const taskStats = db.prepare('SELECT status,COUNT(*) count FROM employee_tasks WHERE user_id=? GROUP BY status').all(req.user.id);
  const typeStats = db.prepare('SELECT task_type,COUNT(*) count FROM employee_tasks WHERE user_id=? GROUP BY task_type').all(req.user.id);
  const leave = db.prepare('SELECT * FROM leave_requests WHERE user_id=? ORDER BY created_at DESC LIMIT 3').all(req.user.id);
  res.json({ user: safeUser(req.user), tasks, notices, taskStats, typeStats, leave, serverTime: now() });
});
employeeRouter.get('/tasks', (req, res) => res.json({ tasks: ownTasks(req.user.id), taskTypes: SPECIALIZED_TASK_TYPES, serverTime: now() }));

employeeRouter.patch('/tasks/:id', (req, res) => {
  const data = parseBody(z.object({
    status: z.enum(['To do', 'In progress', 'Blocked', 'Completed']),
    resultNote: z.string().trim().max(1500).optional().default(''),
    outcome: z.enum(['Verified', 'Needs follow-up']).optional(),
  }), req, res);
  if (!data) return;
  const task = db.prepare(`SELECT ${taskColumns} ${taskJoins} WHERE t.id=? AND t.user_id=?`).get(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: 'Task not found or not authorised.' });
  if (task.status === 'Completed') return res.status(409).json({ error: 'This specialized action is already completed.' });
  const specialized = task.task_type && task.task_type !== 'general';
  if (data.status === 'Completed' && specialized && data.resultNote.length < 5) return res.status(400).json({ error: 'Add a completion note for Chief Administration.' });
  if (data.status === 'Completed' && task.task_type === 'citizen_verification' && !data.outcome) return res.status(400).json({ error: 'Select Verified or Needs follow-up.' });
  if (data.status === 'Completed' && task.task_type === 'citizen_verification' && (!task.report_id || task.report_source !== 'Citizen')) return res.status(409).json({ error: 'The linked citizen incident report is no longer available.' });
  if (data.status === 'Completed' && task.task_type === 'relief_supply') {
    if (!task.delivery_id || task.delivery_status !== 'In transit') return res.status(409).json({ error: 'Only an in-transit relief delivery can be completed.' });
  }
  const timestamp = now();
  let reportVerification = null;
  let deliveryStatus = null;
  let notificationPushed = false;
  const update = db.transaction(() => {
    if (data.status === 'Completed') {
      db.prepare("UPDATE employee_tasks SET status='Completed',result_note=?,completion_outcome=?,completed_at=?,updated_at=? WHERE id=? AND user_id=?")
        .run(data.resultNote, data.outcome || null, timestamp, timestamp, task.id, req.user.id);
    } else {
      db.prepare('UPDATE employee_tasks SET status=?,updated_at=? WHERE id=? AND user_id=?').run(data.status, timestamp, task.id, req.user.id);
    }

    if (data.status === 'Completed' && task.task_type === 'citizen_verification') {
      reportVerification = data.outcome === 'Verified' ? 'Verified' : 'Under review';
      const report = db.prepare(`UPDATE reports SET verification=?,status=CASE WHEN status='Submitted' THEN 'Under review' ELSE status END,updated_at=? WHERE id=? AND simulated=?`)
        .run(reportVerification, timestamp, task.report_id, simulated);
      if (!report.changes) throw new Error('Linked citizen report update failed.');
      db.prepare('INSERT INTO report_events (report_id,actor_id,action,note,created_at) VALUES (?,?,?,?,?)')
        .run(task.report_id, req.user.id, 'Specialized verification submitted', `${data.outcome}: ${data.resultNote}`, timestamp);
    } else if (task.report_id) {
      const action = data.status === 'Completed' && specialized ? 'Specialized action completed' : 'Employee task updated';
      const note = data.status === 'Completed' && specialized ? `${task.task_type}: ${data.resultNote}` : data.status;
      db.prepare('INSERT INTO report_events (report_id,actor_id,action,note,created_at) VALUES (?,?,?,?,?)').run(task.report_id, req.user.id, action, note, timestamp);
    }

    if (data.status === 'Completed' && task.task_type === 'relief_supply') {
      const delivery = db.prepare("UPDATE relief_deliveries SET status='Delivered',updated_at=? WHERE id=? AND status='In transit' AND simulated=?").run(timestamp, task.delivery_id, simulated);
      if (!delivery.changes) throw new Error('Relief delivery state changed before completion.');
      deliveryStatus = 'Delivered';
    }
    if (data.status === 'Completed' && task.task_type === 'notification') {
      db.prepare("INSERT INTO notices (title,body,audience,created_at) VALUES (?,?, 'all', ?)").run(task.title, data.resultNote, timestamp);
      notificationPushed = true;
    }
  });
  try { update(); }
  catch (error) { return res.status(409).json({ error: error.message || 'The task could not be completed.' }); }
  audit(req, 'Updated own task', 'employee_task', req.params.id, { ...data, taskType: task.task_type, reportVerification, deliveryStatus, notificationPushed });
  res.json({ ok: true, status: data.status, reportVerification, deliveryStatus, notificationPushed });
});

employeeRouter.get('/notices', (_req, res) => res.json({ notices: db.prepare("SELECT * FROM notices WHERE audience IN ('employee','all') ORDER BY created_at DESC").all() }));

employeeRouter.get('/leave', (req, res) => {
  const rows = req.user.role === 'employee_admin'
    ? db.prepare('SELECT l.*,u.name AS employee_name,u.department FROM leave_requests l JOIN users u ON u.id=l.user_id ORDER BY l.created_at DESC').all()
    : db.prepare('SELECT * FROM leave_requests WHERE user_id=? ORDER BY created_at DESC').all(req.user.id);
  res.json({ leave: rows });
});
employeeRouter.post('/leave', (req, res) => {
  const data = parseBody(z.object({ startDate: z.string().date(), endDate: z.string().date(), reason: z.string().trim().min(5).max(500) }).refine((v) => v.endDate >= v.startDate, 'End date must be after the start date'), req, res);
  if (!data) return;
  const result = db.prepare('INSERT INTO leave_requests (user_id,start_date,end_date,reason,created_at) VALUES (?,?,?,?,?)').run(req.user.id, data.startDate, data.endDate, data.reason, now());
  audit(req, 'Requested leave', 'leave_request', result.lastInsertRowid, { startDate: data.startDate, endDate: data.endDate });
  res.status(201).json({ id: result.lastInsertRowid });
});
employeeRouter.patch('/leave/:id', requireAdmin, (req, res) => {
  const data = parseBody(z.object({ status: z.enum(['Pending', 'Approved', 'Declined']) }), req, res);
  if (!data) return;
  const result = db.prepare('UPDATE leave_requests SET status=? WHERE id=?').run(data.status, req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Leave request not found.' });
  audit(req, 'Reviewed leave request', 'leave_request', req.params.id, data);
  res.json({ ok: true });
});
employeeRouter.get('/profile', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  const audits = db.prepare("SELECT action,entity_type,entity_id,created_at FROM audit_logs WHERE user_id=? AND portal='employee' ORDER BY created_at DESC LIMIT 30").all(req.user.id);
  res.json({ user: safeUser(user), audits });
});
