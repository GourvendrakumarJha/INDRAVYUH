import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import bcrypt from 'bcryptjs';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'indravyuh-revision-test-'));
process.env.DATA_DIR = dataDir;
process.env.DEMO_MODE = 'true';
process.env.NODE_ENV = 'test';
process.env.AUTH_BEARER_FALLBACK = 'true';

let app, db, sos, createApp;

before(async () => {
  ({ createApp } = await import('../server/app.js'));
  app = createApp();
  ({ db } = await import('../server/db.js'));
  const timestamp = new Date().toISOString();
  db.prepare("INSERT INTO organisations (id,name,type,plan,status,address,contact_email,created_at) VALUES ('org-other','Other Organisation','Partner','Pilot','Active','Supaul','other@example.invalid',?)").run(timestamp);
  db.prepare("INSERT INTO users (id,login_id,password_hash,name,role,portal,organisation_id,created_at) VALUES ('other-business','OTHER-BUSINESS',?,'Other Admin','business_admin','business','org-other',?)")
    .run(bcrypt.hashSync('Supaul@2026', 4), timestamp);
  const submission = await request(app).post('/api/public/sos').send({
    latitude: 26.1080847, longitude: 86.6033095, accuracy: 9, capturedAt: new Date().toISOString(),
  });
  assert.equal(submission.status, 201, JSON.stringify(submission.body));
  sos = { ...submission.body, id: db.prepare('SELECT id FROM reports WHERE reference=?').get(submission.body.reference).id };
});
after(() => { db?.close(); fs.rmSync(dataDir, { recursive: true, force: true }); });

async function login(portal, loginId) {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/login').send({ portal, loginId, password: 'Supaul@2026' });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.ok(response.body.sessionToken);
  return agent;
}

describe('requested revision workflows', () => {
  it('records direct SOS in the Chief Administration queue while keeping it off public layers', async () => {
    assert.match(sos.reference, /^IV-SUP-SOS-/);
    const welfare = await login('welfare', 'WELFARE-DEMO');
    const queue = await welfare.get('/api/welfare/reports?type=sos');
    assert.equal(queue.status, 200);
    const record = queue.body.reports.find((item) => item.reference === sos.reference);
    assert.ok(record);
    assert.equal(record.contact, '');
    assert.equal(record.description, 'One-press GPS assistance request.');
    const publicMap = await request(app).get('/api/public/map-data');
    assert.equal(publicMap.status, 200);
    assert.ok(!publicMap.body.incidents.some((item) => item.reference === sos.reference));
    assert.ok(!publicMap.body.shelters.some((item) => item.reference === sos.reference));
    const tracked = await request(app).get('/api/public/track').query({ reference: sos.reference, accessCode: sos.accessCode });
    assert.equal(tracked.status, 200);
    assert.equal(tracked.body.report.isSos, true);
  });

  it('shares only the intended organisation request and enforces tenant isolation', async () => {
    const welfare = await login('welfare', 'WELFARE-DEMO');
    const created = await welfare.post('/api/welfare/coordination/requests').send({
      organisationId: 'org-demo', reportId: sos.id, title: 'Relief transport', category: 'Logistics',
      details: 'Coordinate one vehicle for the assigned relief route.', priority: 'High',
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const business = await login('business', 'BUSINESS-DEMO');
    const own = await business.get('/api/business/coordination');
    assert.equal(own.status, 200);
    const shared = own.body.requests.find((item) => item.id === created.body.id);
    assert.ok(shared);
    assert.equal(shared.report_reference, sos.reference);
    assert.equal(shared.contact, undefined);
    assert.equal(shared.latitude, undefined);
    const other = await login('business', 'OTHER-BUSINESS');
    const otherView = await other.get('/api/business/coordination');
    assert.equal(otherView.status, 200);
    assert.ok(!otherView.body.requests.some((item) => item.id === created.body.id));
    const forbiddenUpdate = await other.patch(`/api/business/coordination/${created.body.id}`).send({ status: 'Completed' });
    assert.equal(forbiddenUpdate.status, 404);
    const accepted = await business.patch(`/api/business/coordination/${created.body.id}`).send({ status: 'Accepted' });
    assert.equal(accepted.status, 200);
    const welfareView = await welfare.get('/api/welfare/coordination');
    assert.equal(welfareView.body.requests.find((item) => item.id === created.body.id).status, 'Accepted');
  });

  it('assigns report-linked staff work without exposing citizen record details', async () => {
    const welfare = await login('welfare', 'WELFARE-DEMO');
    const assigned = await welfare.post('/api/welfare/coordination/tasks').send({
      employeeId: 'demo-employee-admin', reportId: sos.id, title: 'Verify assistance request',
      description: 'Review the authorised record and update the task.', priority: 'Critical', dueDate: '2026-10-24',
    });
    assert.equal(assigned.status, 201, JSON.stringify(assigned.body));
    const employee = await login('employee', 'EMPLOYEE-DEMO');
    const tasks = await employee.get('/api/employee/tasks');
    assert.equal(tasks.status, 200);
    const task = tasks.body.tasks.find((item) => item.id === assigned.body.id);
    assert.ok(task);
    assert.equal(task.report_reference, sos.reference);
    for (const privateKey of ['contact', 'tracking_hash', 'location_text', 'latitude', 'longitude', 'photo_path']) assert.equal(task[privateKey], undefined);
    assert.equal(JSON.stringify(task).includes('Private callback'), false);
    const updated = await employee.patch(`/api/employee/tasks/${task.id}`).send({ status: 'Completed' });
    assert.equal(updated.status, 200);
    const details = await welfare.get(`/api/welfare/reports/${sos.id}`);
    assert.equal(details.status, 200);
    assert.ok(details.body.events.some((event) => event.action === 'Employee task updated' && event.note === 'Completed'));
  });

  it('retains server-side portal boundaries on every coordination endpoint', async () => {
    const welfare = await login('welfare', 'WELFARE-DEMO');
    const business = await login('business', 'BUSINESS-DEMO');
    const employee = await login('employee', 'EMPLOYEE-DEMO');
    assert.equal((await business.get('/api/welfare/coordination')).status, 403);
    assert.equal((await employee.get('/api/welfare/coordination')).status, 403);
    assert.equal((await welfare.get('/api/business/coordination')).status, 403);
    assert.equal((await employee.get('/api/business/coordination')).status, 403);
    assert.equal((await welfare.post('/api/welfare/coordination/tasks').send({})).status, 400);
    assert.equal((await request(app).get('/api/welfare/coordination')).status, 401);
  });
});
