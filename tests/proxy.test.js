import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'indravyuh-proxy-test-'));
process.env.DATA_DIR = dataDir;
process.env.DEMO_MODE = 'true';
process.env.NODE_ENV = 'test';
process.env.TRUST_PROXY = 'true';
process.env.COOKIE_SECURE = 'true';
process.env.COOKIE_SAMESITE = 'none';
process.env.COOKIE_PARTITIONED = 'true';
process.env.AUTH_BEARER_FALLBACK = 'true';
process.env.APP_ORIGIN = 'https://preview.example.test/';

let app, db, createApp;
before(async () => {
  ({ createApp } = await import('../server/app.js'));
  app = createApp();
  ({ db } = await import('../server/db.js'));
});
after(() => { db?.close(); fs.rmSync(dataDir, { recursive: true, force: true }); });

describe('HTTPS reverse-proxy deployment', () => {
  it('accepts the forwarded public origin and issues a Secure SameSite=None session cookie', async () => {
    const login = () => request(app).post('/api/auth/login')
      .set('Host', 'internal:3000')
      .set('X-Forwarded-Host', 'preview.example.test')
      .set('X-Forwarded-Proto', 'https')
      .set('Origin', 'https://preview.example.test')
      .send({ portal: 'welfare', loginId: 'WELFARE-DEMO', password: 'Supaul@2026' });
    const accepted = await login();
    assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
    const cookie = accepted.headers['set-cookie'][0];
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /SameSite=None/);
    assert.match(cookie, /Partitioned/);
    assert.ok(accepted.body.sessionToken);
    const bearerOnly = await request(app).get('/api/welfare/overview').set('Authorization', `Bearer ${accepted.body.sessionToken}`);
    assert.equal(bearerOnly.status, 200);
    const invalidBearer = await request(app).get('/api/welfare/overview').set('Authorization', 'Bearer invalid-preview-token');
    assert.equal(invalidBearer.status, 401);

    const rejected = await request(app).post('/api/auth/login')
      .set('Host', 'internal:3000')
      .set('X-Forwarded-Host', 'preview.example.test')
      .set('X-Forwarded-Proto', 'https')
      .set('Origin', 'https://attacker.example')
      .send({ portal: 'welfare', loginId: 'WELFARE-DEMO', password: 'Supaul@2026' });
    assert.equal(rejected.status, 403);
    assert.equal(rejected.body.code, 'ORIGIN_REJECTED');
  });

  it('falls back from a stale Bearer token to a valid cookie and accepts the secondary preview header', async () => {
    const login = await request(app).post('/api/auth/login')
      .set('X-Forwarded-Host', 'preview.example.test').set('X-Forwarded-Proto', 'https').set('Origin', 'https://preview.example.test')
      .send({ portal: 'welfare', loginId: 'WELFARE-DEMO', password: 'Supaul@2026' });
    assert.equal(login.status, 200);
    const cookie = login.headers['set-cookie'][0].split(';')[0];
    const recovered = await request(app).get('/api/welfare/overview').set('Cookie', cookie).set('Authorization', 'Bearer stale-preview-token');
    assert.equal(recovered.status, 200, JSON.stringify(recovered.body));
    const secondary = await request(app).get('/api/welfare/overview').set('X-INDRAVYUH-Session', login.body.sessionToken);
    assert.equal(secondary.status, 200, JSON.stringify(secondary.body));
    const loggedOut = await request(app).post('/api/auth/logout').set('Cookie', cookie).set('Authorization', 'Bearer stale-preview-token');
    assert.equal(loggedOut.status, 200);
    assert.equal((await request(app).get('/api/welfare/overview').set('Cookie', cookie)).status, 401);
  });
});
