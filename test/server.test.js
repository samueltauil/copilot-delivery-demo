import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { createApp } from '../src/server.js';

async function start(t, options) {
  const app = createApp(options);
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  t.after(() => new Promise((resolve) => {
    app.close(resolve);
    app.closeAllConnections();
  }));
  return `http://127.0.0.1:${app.address().port}`;
}

test('creates and lists requests through HTTP', async (t) => {
  const base = await start(t);
  const response = await fetch(`${base}/api/requests`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requesterName: 'Demo' })
  });
  assert.equal(response.status, 201);
  const { request } = await response.json();
  assert.equal(request.requesterName, 'Demo');
  assert.deepEqual(await (await fetch(`${base}/api/requests`)).json(), { requests: [request] });
});

test('transport errors are explicit and do not mutate data', async (t) => {
  const base = await start(t);
  const cases = [
    [{ method: 'POST', body: '{}' }, 415],
    [{ method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' }, 400],
    [{ method: 'POST', headers: { 'content-type': 'application/json' }, body: 'null' }, 400],
    [{ method: 'POST', headers: { 'content-type': 'application/json' }, body: '[]' }, 400],
    [{ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ description: 'x'.repeat(17000) }) }, 413],
    [{ method: 'DELETE' }, 405]
  ];
  for (const [options, expected] of cases) {
    const response = await fetch(`${base}/api/requests`, options);
    assert.equal(response.status, expected);
    assert.equal(typeof (await response.json()).error.message, 'string');
  }
  assert.deepEqual(await (await fetch(`${base}/api/requests`)).json(), { requests: [] });
});

test('serves only fixed assets and rejects unknown routes and methods', async (t) => {
  const base = await start(t);
  for (const path of ['/', '/app.js', '/styles.css']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  }
  for (const path of ['/package.json', '/src/server.js', '/missing', '/%2e%2e/package.json']) {
    assert.equal((await fetch(base + path)).status, 404);
  }
  const response = await fetch(base, { method: 'POST' });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET');
});

test('unexpected errors are logged and never returned as success', async (t) => {
  const errors = [];
  const base = await start(t, {
    store: { list() { throw new Error('private diagnostic'); } },
    logger: { error(...args) { errors.push(args); } }
  });
  const response = await fetch(`${base}/api/requests`);
  assert.equal(response.status, 500);
  assert.equal((await response.json()).error.message, 'An unexpected server error occurred.');
  assert.equal(errors.length, 1);
});
