import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'indravyuh-specialized-test-'));
process.env.DATA_DIR = dataDir;
process.env.DEMO_MODE = 'true';
process.env.NODE_ENV = 'test';
process.env.AUTH_BEARER_FALLBACK = 'true';

let app, db, chief, officer;
const dueDate = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);
async function login(portal, loginId) {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/login').send({ portal, loginId, password: 'Supaul@2026' });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  return agent;
}
async function createCitizen(extra = {}) {
  const response = await request(app).post('/api/public/reports').send({
    category: 'waterlogging', description: 'Citizen observation for the specialized verification workflow.',
    locationText: 'Supaul ward coordination point', observedAt: new Date().toISOString(), contact: 'Private citizen contact',
    reporterName: 'Citizen test reporter', peopleCount: 12, peopleTrapped: 2, vulnerableCount: 3, consent: true, isSos: false,
    ...extra,
  });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  return { ...response.body, id: db.prepare('SELECT id FROM reports WHERE reference=?').get(response.body.reference).id };
}
async function assign(payload) {
  const response = await chief.post('/api/welfare/coordination/tasks').send({
    employeeId: 'demo-employee-admin', title: 'Specialized test action', description: 'Return a factual outcome to Chief Administration.',
    priority: 'High', dueDate: dueDate(), taskType: 'monitoring', ...payload,
  });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  return response.body.id;
}

before(async () => {
  const { createApp } = await import('../server/app.js');
  app = createApp();
  ({ db } = await import('../server/db.js'));
  chief = await login('welfare', 'WELFARE-DEMO');
  officer = await login('employee', 'EMPLOYEE-DEMO');
});
after(() => { db?.close(); fs.rmSync(dataDir, { recursive: true, force: true }); });

describe('citizen separation and Specialized Action round trips', () => {
  it('discards operational measurements from citizen submissions while retaining human impact', async () => {
    const beforeStats = await request(app).get('/api/public/bootstrap');
    assert.equal(beforeStats.body.stats.citizenReports, db.prepare("SELECT COUNT(*) count FROM reports WHERE is_sos=0 AND source='Citizen' AND simulated=1").get().count);
    const created = await createCitizen({
      waterLevelCm: 999, flowVelocityMs: 20, rainfall1hMm: 400, rainfall24hMm: 900,
      riseRateCmh: 200, accessCondition: 'Blocked', riskScore: 100,
    });
    assert.equal(created.riskScore, null);
    assert.equal(created.riskBand, null);
    const record = db.prepare('SELECT * FROM reports WHERE id=?').get(created.id);
    assert.equal(record.source, 'Citizen');
    assert.equal(record.reporter_name, 'Citizen test reporter');
    assert.equal(record.people_count, 12);
    assert.equal(record.people_trapped, 2);
    assert.equal(record.vulnerable_count, 3);
    for (const column of ['water_level_cm','flow_velocity_ms','rainfall_1h_mm','rainfall_24h_mm','rise_rate_cmh','access_condition','risk_score','risk_band','risk_confidence']) assert.equal(record[column], null, column);
    const tracked = await request(app).get('/api/public/track').query({ reference: created.reference, accessCode: created.accessCode });
    assert.equal(tracked.status, 200);
    assert.equal(JSON.stringify(tracked.body).includes('waterLevel'), false);
    const afterStats = await request(app).get('/api/public/bootstrap');
    assert.equal(afterStats.body.stats.citizenReports, beforeStats.body.stats.citizenReports + 1);
    const formSos = await request(app).post('/api/public/reports').send({
      category: 'flooding', description: 'A form-based SOS attempt must use the one-press GPS workflow.', locationText: 'Supaul coordination point',
      latitude: 26.1080847, longitude: 86.6033095, observedAt: new Date().toISOString(), consent: true, isSos: true,
    });
    assert.equal(formSos.status, 400);
  });

  it('limits citizen-verification assignments to non-SOS citizen reports and protects evidence', async () => {
    const measured = db.prepare("SELECT id FROM reports WHERE reference='IV-SUP-DEMO01'").get();
    const rejected = await chief.post('/api/welfare/coordination/tasks').send({
      employeeId: 'demo-employee-admin', reportId: measured.id, taskType: 'citizen_verification', title: 'Invalid measured verification',
      description: 'This must not be accepted as a citizen report.', priority: 'High', dueDate: dueDate(),
    });
    assert.equal(rejected.status, 400);
    const citizen = await createCitizen();
    const id = await assign({ taskType: 'citizen_verification', reportId: citizen.id, title: 'Verify protected citizen evidence' });
    const invalidDelivery = await chief.post('/api/welfare/coordination/tasks').send({
      employeeId: 'demo-employee-admin', reportId: citizen.id, deliveryId: 'IV-SUP-DLV-DEMO01', taskType: 'citizen_verification',
      title: 'Invalid delivery-linked verification', description: 'A citizen verification cannot retain a relief delivery.', priority: 'High', dueDate: dueDate(),
    });
    assert.equal(invalidDelivery.status, 400);
    const tasks = await officer.get('/api/employee/tasks');
    const task = tasks.body.tasks.find((item) => item.id === id);
    assert.equal(task.task_type, 'citizen_verification');
    assert.equal(task.report_reference, citizen.reference);
    assert.equal(task.verification_location, 'Supaul ward coordination point');
    assert.equal(task.contact, undefined);
    assert.equal(task.latitude, undefined);
    assert.equal(JSON.stringify(task).includes('Private citizen contact'), false);
    assert.equal((await chief.get('/api/welfare/coordination')).body.reports.find((item) => item.id === citizen.id).source, 'Citizen');
  });

  it('requires verification outcomes and returns them to the linked Chief Administration record', async () => {
    const citizen = await createCitizen();
    const id = await assign({ taskType: 'citizen_verification', reportId: citizen.id, title: 'Verify and return citizen outcome' });
    assert.equal((await officer.patch(`/api/employee/tasks/${id}`).send({ status: 'Completed', outcome: 'Verified' })).status, 400);
    assert.equal((await officer.patch(`/api/employee/tasks/${id}`).send({ status: 'Completed', resultNote: 'Checked the shared observation.' })).status, 400);
    const completed = await officer.patch(`/api/employee/tasks/${id}`).send({ status: 'Completed', resultNote: 'The location and observation were checked against the shared evidence.', outcome: 'Needs follow-up' });
    assert.equal(completed.status, 200, JSON.stringify(completed.body));
    assert.equal(completed.body.reportVerification, 'Under review');
    const report = db.prepare('SELECT * FROM reports WHERE id=?').get(citizen.id);
    assert.equal(report.verification, 'Under review');
    assert.equal(report.status, 'Under review');
    const details = await chief.get(`/api/welfare/reports/${citizen.id}`);
    assert.ok(details.body.events.some((event) => event.action === 'Specialized verification submitted' && event.note.includes('Needs follow-up')));
    const coordination = await chief.get('/api/welfare/coordination');
    const outcome = coordination.body.staffTasks.find((item) => item.id === id);
    assert.equal(outcome.status, 'Completed');
    assert.equal(outcome.completion_outcome, 'Needs follow-up');
    assert.match(outcome.result_note, /shared evidence/);
    assert.equal((await officer.patch(`/api/employee/tasks/${id}`).send({ status: 'Completed', resultNote: 'Duplicate completion.', outcome: 'Verified' })).status, 409);
  });

  it('supports a Verified outcome and locks the completed assignment', async () => {
    const citizen = await createCitizen();
    const id = await assign({ taskType: 'citizen_verification', reportId: citizen.id, title: 'Confirm verified citizen observation' });
    const completed = await officer.patch(`/api/employee/tasks/${id}`).send({ status: 'Completed', resultNote: 'Verified from the authorised assignment evidence.', outcome: 'Verified' });
    assert.equal(completed.status, 200);
    assert.equal(completed.body.reportVerification, 'Verified');
    assert.equal(db.prepare('SELECT verification FROM reports WHERE id=?').get(citizen.id).verification, 'Verified');
    assert.equal((await officer.patch(`/api/employee/tasks/${id}`).send({ status: 'In progress' })).status, 409);
  });

  it('completes relief supply transactionally without changing allocated stock again', async () => {
    const logistics = await chief.get('/api/welfare/logistics');
    const item = logistics.body.relief.find((entry) => entry.item === 'Dry ration packets');
    const delivery = await chief.post('/api/welfare/logistics/deliveries').send({ itemId: item.id, quantity: 4, destination: 'Supaul ward coordination point', area: 'Supaul', peopleReached: 12, note: 'Specialized completion test allocation.' });
    assert.equal(delivery.status, 201, JSON.stringify(delivery.body));
    const allocated = db.prepare('SELECT quantity FROM relief WHERE id=?').get(item.id).quantity;
    const id = await assign({ taskType: 'relief_supply', deliveryId: delivery.body.id, title: 'Complete assigned ration delivery' });
    assert.equal((await officer.patch(`/api/employee/tasks/${id}`).send({ status: 'Completed' })).status, 400);
    const completed = await officer.patch(`/api/employee/tasks/${id}`).send({ status: 'Completed', resultNote: 'Delivered to the named coordination point and acknowledged.' });
    assert.equal(completed.status, 200, JSON.stringify(completed.body));
    assert.equal(completed.body.deliveryStatus, 'Delivered');
    assert.equal(db.prepare('SELECT status FROM relief_deliveries WHERE id=?').get(delivery.body.id).status, 'Delivered');
    assert.equal(db.prepare('SELECT quantity FROM relief WHERE id=?').get(item.id).quantity, allocated);
    const coordination = await chief.get('/api/welfare/coordination');
    assert.equal(coordination.body.staffTasks.find((item) => item.id === id).delivery_status, 'Delivered');
  });

  it('executes monitoring, communication, tracking and notification assignments online', async () => {
    const types = ['monitoring','communication','tracking','notification'];
    for (const taskType of types) {
      const id = await assign({ taskType, title: `Complete ${taskType} action` });
      assert.equal((await officer.patch(`/api/employee/tasks/${id}`).send({ status: 'In progress' })).status, 200);
      const result = await officer.patch(`/api/employee/tasks/${id}`).send({ status: 'Completed', resultNote: `${taskType} outcome recorded for Chief Administration.` });
      assert.equal(result.status, 200, JSON.stringify(result.body));
      if (taskType === 'notification') assert.equal(result.body.notificationPushed, true);
    }
    const tasks = await officer.get('/api/employee/tasks');
    for (const taskType of types) assert.ok(tasks.body.tasks.some((item) => item.task_type === taskType && item.status === 'Completed'));
    assert.deepEqual(tasks.body.taskTypes, ['general','citizen_verification','monitoring','communication','relief_supply','tracking','notification']);
    const notices = await officer.get('/api/employee/notices');
    assert.ok(notices.body.notices.some((item) => item.title === 'Complete notification action' && item.body.includes('notification outcome recorded')));
    const coordination = await chief.get('/api/welfare/coordination');
    for (const taskType of types) assert.ok(coordination.body.staffTasks.some((item) => item.task_type === taskType && item.status === 'Completed'));
  });
});
