import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

function originWith(env) {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', "const { config } = await import('./server/config.js'); process.stdout.write(config.appOrigin);"], {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: 'production', ...env },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

describe('resumable preview origin configuration', () => {
  it('derives the current sandbox host and preserves explicit production overrides', () => {
    assert.equal(originWith({ APP_ORIGIN: '', E2B_SANDBOX_ID: 'current-sandbox', PORT: '3000' }), 'https://3000-current-sandbox.e2b.app');
    assert.equal(originWith({ APP_ORIGIN: '', E2B_SANDBOX_ID: 'resumed-sandbox', PORT: '3123' }), 'https://3123-resumed-sandbox.e2b.app');
    assert.equal(originWith({ APP_ORIGIN: 'https://operations.example.org', E2B_SANDBOX_ID: 'ignored-sandbox', PORT: '3000' }), 'https://operations.example.org');
  });
});
