import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'indravyuh-test-'));
process.env.DATA_DIR = dataDir;
process.env.DEMO_MODE = 'true';
process.env.NODE_ENV = 'test';
process.env.COOKIE_SECURE = 'false';

let app, db, bcrypt, createApp;
const credentials = { welfare: 'WELFARE-DEMO', business: 'BUSINESS-DEMO', employee: 'EMPLOYEE-DEMO', operator: 'OPERATOR-DEMO' };
const password = 'Supaul@2026';
async function login(portal, loginId = credentials[portal]) {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/login').send({ portal, loginId, password });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  return agent;
}
const validReport = {
  category: 'waterlogging', description: 'Automated test report with fictional observation details.',
  locationText: 'Supaul automated test point', latitude: 26.126, longitude: 86.605,
  observedAt: new Date(Date.now() - 3600000).toISOString(), contact: '', consent: true, isSos: false,
};

before(async () => {
  ({ createApp } = await import('../server/app.js'));
  ({ db } = await import('../server/db.js'));
  ({ default: bcrypt } = await import('bcryptjs'));
  app = createApp();
});
after(() => { db?.close(); fs.rmSync(dataDir, { recursive: true, force: true }); });

describe('public safety and report workflow', () => {
  it('serves health, security headers and only simulated public fixtures', async () => {
    const health = await request(app).get('/api/health');
    assert.equal(health.status, 200);
    assert.equal(health.body.demoMode, true);
    assert.match(health.headers['content-security-policy'], /default-src/);
    const response = await request(app).get('/api/public/bootstrap');
    assert.equal(response.status, 200);
    assert.equal(response.body.district.name, 'Supaul');
    assert.ok(response.body.alerts.length >= 2);
    assert.ok(response.body.shelters.every((s) => s.simulated === 1));
    assert.ok(response.body.incidents.every((i) => !('contact' in i) && !('description' in i)));
  });

  it('rejects coordinates outside Supaul district', async () => {
    const response = await request(app).post('/api/public/reports').send({ ...validReport, latitude: 25.5, longitude: 85.5 });
    assert.equal(response.status, 400);
    assert.equal(response.body.code, 'OUTSIDE_DISTRICT');
  });

  it('stores a report before returning private tracking credentials', async () => {
    const submitted = await request(app).post('/api/public/reports').send(validReport);
    assert.equal(submitted.status, 201, JSON.stringify(submitted.body));
    assert.match(submitted.body.reference, /^IV-SUP-RPT-/);
    assert.equal(submitted.body.accessCode.length, 12);
    const stored = db.prepare('SELECT * FROM reports WHERE reference=?').get(submitted.body.reference);
    assert.equal(stored.status, 'Submitted');
    assert.equal(stored.priority, 'Normal');
    assert.equal(stored.verification, 'Unverified');
    const rejected = await request(app).get('/api/public/track').query({ reference: submitted.body.reference, accessCode: 'WRONG-CODE-99' });
    assert.equal(rejected.status, 404);
    const tracked = await request(app).get('/api/public/track').query({ reference: submitted.body.reference, accessCode: submitted.body.accessCode });
    assert.equal(tracked.status, 200);
    assert.equal(tracked.body.report.status, 'Submitted');
    assert.ok(!('contact' in tracked.body.report));
  });
});

describe('authentication and server-enforced portal boundaries', () => {
  it('requires authentication for every private API', async () => {
    for (const portal of ['welfare', 'business', 'employee']) {
      const response = await request(app).get(`/api/${portal}/overview`);
      assert.equal(response.status, 401);
    }
  });
  it('rejects an incorrect password and a valid ID used at the wrong portal', async () => {
    const bad = await request(app).post('/api/auth/login').send({ portal: 'welfare', loginId: credentials.welfare, password: 'incorrect-password' });
    assert.equal(bad.status, 401);
    const wrongPortal = await request(app).post('/api/auth/login').send({ portal: 'business', loginId: credentials.welfare, password });
    assert.equal(wrongPortal.status, 403);
    const caseInsensitiveId = await request(app).post('/api/auth/login').send({ portal: 'welfare', loginId: credentials.welfare.toLowerCase(), password });
    assert.equal(caseInsensitiveId.status, 200);
  });
  it('sets an HttpOnly, SameSite=Strict session cookie', async () => {
    const response = await request(app).post('/api/auth/login').send({ portal: 'welfare', loginId: credentials.welfare, password });
    assert.equal(response.status, 200);
    const cookie = response.headers['set-cookie'][0];
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Strict/);
    assert.doesNotMatch(cookie, /iv_session=[^;]+;.*Secure/i);
  });
  it('blocks every cross-portal API attempt', async () => {
    const welfare = await login('welfare');
    assert.equal((await welfare.get('/api/welfare/overview')).status, 200);
    assert.equal((await welfare.get('/api/business/overview')).status, 403);
    assert.equal((await welfare.get('/api/employee/overview')).status, 403);
    const business = await login('business');
    assert.equal((await business.get('/api/business/overview')).status, 200);
    assert.equal((await business.get('/api/welfare/overview')).status, 403);
    assert.equal((await business.get('/api/employee/overview')).status, 403);
    const employee = await login('employee');
    assert.equal((await employee.get('/api/employee/overview')).status, 200);
    assert.equal((await employee.get('/api/welfare/overview')).status, 403);
    assert.equal((await employee.get('/api/business/overview')).status, 403);
  });
  it('keeps audit history administrator-only', async () => {
    const operator = await login('welfare', credentials.operator);
    assert.equal((await operator.get('/api/welfare/overview')).status, 200);
    assert.equal((await operator.get('/api/welfare/audit')).status, 403);
    assert.equal((await operator.get('/api/welfare/export/reports.csv')).status, 403);
  });
});

describe('operational updates and privacy', () => {
  it('publishes only verified non-SOS reports and reduces public location precision', async () => {
    const agent = await login('welfare');
    const sos = db.prepare('SELECT * FROM reports WHERE is_sos=1 LIMIT 1').get();
    const sosAttempt = await agent.patch(`/api/welfare/reports/${sos.id}`).send({ verification: 'Verified', isPublic: true, note: 'Test must reject SOS publication' });
    assert.equal(sosAttempt.status, 400);
    const report = db.prepare("SELECT * FROM reports WHERE is_sos=0 AND verification='Unverified' LIMIT 1").get();
    const updated = await agent.patch(`/api/welfare/reports/${report.id}`).send({ status: 'Verified', verification: 'Verified', priority: 'High', assignedTeam: 'TEAM-DEMO-01', isPublic: true, note: 'Automated verification test' });
    assert.equal(updated.status, 200, JSON.stringify(updated.body));
    const events = db.prepare('SELECT * FROM report_events WHERE report_id=? ORDER BY id DESC').all(report.id);
    assert.equal(events[0].action, 'Operational update');
    const publicMap = await request(app).get('/api/public/map-data');
    const published = publicMap.body.incidents.find((i) => i.reference === report.reference);
    assert.ok(published);
    const decimalPlaces = String(published.latitude).split('.')[1]?.length || 0;
    assert.ok(decimalPlaces <= 2, `Expected reduced coordinate precision, got ${published.latitude}`);
    assert.ok(!('description' in published));
    assert.ok(!('contact' in published));
  });
});

describe('tenant and ownership isolation', () => {
  it('never returns another organisation’s invoices and scopes new members to the caller', async () => {
    db.prepare("INSERT INTO organisations (id,name,type,plan,status,created_at) VALUES ('org-other','Other Tenant','institution','Other','Active',?)").run(new Date().toISOString());
    db.prepare("INSERT INTO invoices (id,organisation_id,number,description,amount,status,due_date,issued_at) VALUES ('INV-OTHER','org-other','OTHER/001','Other tenant secret',999999,'Due soon','2026-12-01','2026-10-01')").run();
    const agent = await login('business');
    const invoices = await agent.get('/api/business/invoices');
    assert.equal(invoices.status, 200);
    assert.ok(invoices.body.invoices.every((invoice) => invoice.organisation_id === 'org-demo'));
    const newMember = await agent.post('/api/business/members').send({ loginId: 'TENANT-TEST-USER', name: 'Tenant Test User', jobTitle: 'Tester', password: 'VerySecure@Test123' });
    assert.equal(newMember.status, 201, JSON.stringify(newMember.body));
    const member = db.prepare('SELECT * FROM users WHERE login_id=?').get('TENANT-TEST-USER');
    assert.equal(member.organisation_id, 'org-demo');
    assert.equal(member.portal, 'business');
  });
  it('allows employees to update only their own tasks', async () => {
    db.prepare("INSERT INTO users (id,login_id,password_hash,name,role,portal,created_at) VALUES ('other-employee','OTHER-EMPLOYEE',?,'Other Employee','employee','employee',?)")
      .run(bcrypt.hashSync('AnotherSecure@123', 4), new Date().toISOString());
    const result = db.prepare("INSERT INTO employee_tasks (user_id,title,status,created_at,updated_at) VALUES ('other-employee','Private other-user task','To do',?,?)").run(new Date().toISOString(), new Date().toISOString());
    const agent = await login('employee');
    const response = await agent.patch(`/api/employee/tasks/${result.lastInsertRowid}`).send({ status: 'Completed' });
    assert.equal(response.status, 404);
    assert.equal(db.prepare('SELECT status FROM employee_tasks WHERE id=?').get(result.lastInsertRowid).status, 'To do');
  });
});
