import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'indravyuh-superset-test-'));
process.env.DATA_DIR = dataDir;
process.env.DEMO_MODE = 'true';
process.env.NODE_ENV = 'test';
process.env.AUTH_BEARER_FALLBACK = 'true';

let app, db, sos;
before(async () => {
  const { createApp } = await import('../server/app.js');
  app = createApp();
  ({ db } = await import('../server/db.js'));
  const response = await request(app).post('/api/public/sos').send({ latitude: 26.1080847, longitude: 86.6033095, accuracy: 12.4, capturedAt: new Date().toISOString() });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  sos = { ...response.body, id: db.prepare('SELECT id FROM reports WHERE reference=?').get(response.body.reference).id };
});
after(() => { db?.close(); fs.rmSync(dataDir, { recursive: true, force: true }); });

async function login(portal = 'welfare', loginId = 'WELFARE-DEMO') {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/login').send({ portal, loginId, password: 'Supaul@2026' });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  return agent;
}
const fieldReport = {
  category: 'waterlogging', description: 'Water has reached the college approach and restricted the east gate.', locationText: 'Supaul College of Engineering',
  latitude: 26.1080847, longitude: 86.6033095, observedAt: new Date().toISOString(), contact: '', peopleCount: 76, peopleTrapped: 11, vulnerableCount: 18,
  waterLevelCm: 148, flowVelocityMs: 1.9, rainfall1hMm: 64, rainfall24hMm: 118, riseRateCmh: 15, accessCondition: 'Restricted',
};

describe('FloodShield superset workflows', () => {
  it('stores one-press SOS with a unique serial and exact restricted origin', async () => {
    assert.match(sos.serialNumber, /^IV-SUP-SOS-/);
    assert.equal(sos.coordinates.latitude, 26.1080847);
    assert.equal(sos.coordinates.longitude, 86.6033095);
    const record = db.prepare('SELECT * FROM reports WHERE id=?').get(sos.id);
    assert.equal(record.response_stage, 'Received');
    assert.equal(record.gps_accuracy, 12.4);
    assert.equal(record.latitude, 26.1080847);
    assert.equal(record.longitude, 86.6033095);
    const tracked = await request(app).get('/api/public/track').query({ reference: sos.reference, accessCode: sos.accessCode });
    assert.equal(tracked.status, 200);
    assert.equal(tracked.body.report.responseStage, 'Received');
    const publicMap = await request(app).get('/api/public/map-data');
    assert.ok(!publicMap.body.incidents.some((item) => item.reference === sos.reference));
    const duplicate = db.prepare('SELECT COUNT(*) count FROM reports WHERE reference=?').get(sos.reference).count;
    assert.equal(duplicate, 1);
  });

  it('requires current in-district GPS for SOS and authentication for staff reports', async () => {
    assert.equal((await request(app).post('/api/public/sos').send({})).status, 400);
    assert.equal((await request(app).post('/api/public/sos').send({ latitude: 28.61, longitude: 77.2 })).body.code, 'OUTSIDE_DISTRICT');
    assert.equal((await request(app).post('/api/welfare/reports').send(fieldReport)).status, 401);
    const business = await login('business', 'BUSINESS-DEMO');
    assert.equal((await business.post('/api/welfare/reports').send(fieldReport)).status, 403);
  });

  it('lets Chief Administration staff submit a field report and calculates the documented 79/100 risk', async () => {
    const welfare = await login('welfare', 'OPERATOR-DEMO');
    const created = await welfare.post('/api/welfare/reports').send(fieldReport);
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.riskScore, 79);
    assert.equal(created.body.riskBand, 'Critical');
    const record = db.prepare('SELECT * FROM reports WHERE reference=?').get(created.body.reference);
    assert.equal(record.created_by, 'demo-welfare-operator');
    assert.equal(record.source, 'Chief Administration field report');
    assert.equal(record.risk_confidence, 'Complete');
    const queue = await welfare.get('/api/welfare/reports?type=reports');
    assert.equal(queue.status, 200);
    assert.ok(queue.body.reports.some((item) => item.reference === created.body.reference && item.risk_score === 79));
  });

  it('enforces every SOS response transition and preserves specific subpaths', async () => {
    const welfare = await login('welfare', 'OPERATOR-DEMO');
    assert.equal((await welfare.post(`/api/welfare/reports/${sos.id}/response`).send({})).status, 400);
    assert.equal((await welfare.post(`/api/welfare/reports/${sos.id}/response`).send({ stage: 'Dispatched', assignedTeam: 'TEAM-DEMO-01' })).status, 409);
    assert.equal((await welfare.post(`/api/welfare/reports/${sos.id}/response`).send({ stage: 'Acknowledged', note: 'Operator acknowledged the GPS signal.' })).status, 200);
    assert.equal((await welfare.post(`/api/welfare/reports/${sos.id}/response`).send({ stage: 'Dispatched' })).status, 400);
    assert.equal((await welfare.post(`/api/welfare/reports/${sos.id}/response`).send({ stage: 'Dispatched', assignedTeam: 'TEAM-DEMO-01' })).status, 200);
    assert.equal((await welfare.post(`/api/welfare/reports/${sos.id}/response`).send({ stage: 'Responding' })).status, 200);
    assert.equal((await welfare.post(`/api/welfare/reports/${sos.id}/response`).send({ stage: 'Resolved', peopleAssisted: 3 })).status, 200);
    assert.equal((await welfare.post(`/api/welfare/reports/${sos.id}/response`).send({ stage: 'Resolved' })).status, 409);
    const details = await welfare.get(`/api/welfare/reports/${sos.id}`);
    assert.equal(details.status, 200);
    assert.equal(details.body.report.response_stage, 'Resolved');
    assert.equal(details.body.report.people_assisted, 3);
    for (const stage of ['Acknowledged', 'Dispatched', 'Responding', 'Resolved']) assert.ok(details.body.events.some((event) => event.action === `SOS ${stage}`));
    const tracked = await request(app).get('/api/public/track').query({ reference: sos.reference, accessCode: sos.accessCode });
    assert.equal(tracked.body.report.responseStage, 'Resolved');
  });

  it('publishes named-area alerts with route conditions and administrator-only release', async () => {
    const alerts = await request(app).get('/api/public/alerts');
    assert.ok(alerts.body.alerts.some((item) => item.title_en === 'Water reaching Supaul College of Engineering' && item.landmark === 'Supaul College of Engineering'));
    assert.ok(alerts.body.alerts.some((item) => item.title_en === 'All routes blocked in Raghopur' && item.route_status === 'Blocked'));
    const operator = await login('welfare', 'OPERATOR-DEMO');
    const payload = { titleEn: 'East approach blocked at Sadar Hospital', titleHi: 'सदर अस्पताल का पूर्वी मार्ग अवरुद्ध', bodyEn: 'The east approach at Sadar Hospital is blocked; use the authorised coordination route.', bodyHi: 'सदर अस्पताल का पूर्वी मार्ग अवरुद्ध है; अधिकृत समन्वय मार्ग का उपयोग करें।', area: 'Supaul', landmark: 'Sadar Hospital', routeStatus: 'Blocked', severity: 'Urgent', source: 'INDRAVYUH coordination desk', publish: false };
    assert.equal((await operator.post('/api/welfare/alerts').send({ ...payload, area: '' })).status, 400);
    assert.equal((await operator.post('/api/welfare/alerts').send({ ...payload, publish: true })).status, 403);
    const draft = await operator.post('/api/welfare/alerts').send(payload);
    assert.equal(draft.status, 201, JSON.stringify(draft.body));
    const admin = await login();
    const published = await admin.patch(`/api/welfare/alerts/${draft.body.id}/publish`);
    assert.equal(published.status, 200);
    const updated = await request(app).get('/api/public/alerts');
    assert.ok(updated.body.alerts.some((item) => item.id === draft.body.id && item.area === 'Supaul' && item.route_status === 'Blocked'));
  });

  it('provides two-code family lookup without exposing the restricted contact', async () => {
    const created = await request(app).post('/api/public/family-checkins').send({ name: 'Test Family Member', status: 'At shelter', area: 'Supaul', shelterId: 'SH-DEMO-01', note: 'Checked in with family.', contact: 'Private family contact', consent: true });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal((await request(app).get('/api/public/family-safety').query({ reference: created.body.reference, accessCode: 'WRONG-CODE-99' })).status, 404);
    const found = await request(app).get('/api/public/family-safety').query({ reference: created.body.reference, accessCode: created.body.accessCode });
    assert.equal(found.status, 200);
    assert.equal(found.body.checkin.name, 'Test Family Member');
    assert.equal(found.body.checkin.contact, undefined);
    assert.equal(JSON.stringify(found.body).includes('Private family contact'), false);
    const welfare = await login();
    const register = await welfare.get('/api/welfare/family-safety');
    assert.equal(register.status, 200);
    const row = register.body.checkins.find((item) => item.reference === created.body.reference);
    assert.equal(row.contact, 'Private family contact');
    assert.equal((await welfare.patch(`/api/welfare/family-safety/${row.id}`).send({ status: 'Need assistance' })).status, 200);
    const employee = await login('employee', 'EMPLOYEE-DEMO');
    assert.equal((await employee.get('/api/welfare/family-safety')).status, 403);
  });

  it('allocates relief stock, tracks delivery subpaths and prevents overspending', async () => {
    const welfare = await login();
    const beforeData = await welfare.get('/api/welfare/logistics');
    assert.equal(beforeData.status, 200);
    const item = beforeData.body.relief.find((entry) => entry.item === 'Oral rehydration salts');
    const created = await welfare.post('/api/welfare/logistics/deliveries').send({ itemId: item.id, quantity: 5, destination: 'Supaul College of Engineering coordination point', area: 'Supaul', peopleReached: 10, note: 'Medical relief allocation for the listed coordination point.' });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const afterData = await welfare.get('/api/welfare/logistics');
    assert.equal(afterData.body.relief.find((entry) => entry.id === item.id).quantity, item.quantity - 5);
    assert.equal((await welfare.patch(`/api/welfare/logistics/deliveries/${created.body.id}`).send({ status: 'Delivered' })).status, 200);
    assert.equal((await welfare.patch(`/api/welfare/logistics/deliveries/${created.body.id}`).send({ status: 'Cancelled' })).status, 409);
    const cancelled = await welfare.post('/api/welfare/logistics/deliveries').send({ itemId: item.id, quantity: 2, destination: 'Nirmali coordination point', area: 'Nirmali', peopleReached: null, note: 'Cancellation must restore this allocation exactly once.' });
    assert.equal(cancelled.status, 201);
    assert.equal((await welfare.patch(`/api/welfare/logistics/deliveries/${cancelled.body.id}`).send({ status: 'Cancelled' })).status, 200);
    assert.equal((await welfare.patch(`/api/welfare/logistics/deliveries/${cancelled.body.id}`).send({ status: 'Cancelled' })).status, 409);
    const finalData = await welfare.get('/api/welfare/logistics');
    assert.equal(finalData.body.relief.find((entry) => entry.id === item.id).quantity, item.quantity - 5);
    const command = await welfare.get('/api/welfare/command');
    assert.ok(command.body.stats.peopleReached >= 10);
    const excessive = await welfare.post('/api/welfare/logistics/deliveries').send({ itemId: item.id, quantity: 999999, destination: 'Nirmali coordination point', area: 'Nirmali', peopleReached: null, note: 'Excess allocation must be rejected.' });
    assert.equal(excessive.status, 400);
  });

  it('returns district command, response notices and component-level risk analytics', async () => {
    const welfare = await login();
    const command = await welfare.get('/api/welfare/command');
    assert.equal(command.status, 200);
    assert.ok(command.body.stats.totalSos >= 3);
    assert.ok(Array.isArray(command.body.dispatch));
    assert.ok(Array.isArray(command.body.notices));
    const risk = await welfare.get('/api/welfare/risk-analytics');
    assert.equal(risk.status, 200);
    assert.equal(risk.body.method.length, 6);
    assert.ok(risk.body.reports.some((item) => item.risk_score === 79 && item.components.length === 6));
    assert.equal(risk.body.reports[0].components[0].label, 'Water level');
  });
});
