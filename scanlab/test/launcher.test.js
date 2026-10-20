import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { startBackend, callBackend } from '../../scripts/scanlab-backend.js';
import { juliaRuntime } from '../../scripts/julia-runtime.js';
import { controlRequest, summarizeState } from '../../scripts/scanlab-control.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const connection = {
  token: '11111111-1111-1111-1111-111111111111',
  instanceId: '22222222-2222-2222-2222-222222222222', pid: 123
};

test('CLI controls accept only bounded commands and never print connection capabilities or image arrays', () => {
  assert.deepEqual(controlRequest(['state']), { action: 'state' });
  assert.deepEqual(controlRequest(['run', 'gentle']), { action: 'run', input: { preset: 'gentle' } });
  assert.deepEqual(controlRequest(['pin', connection.instanceId]), { action: 'pin', input: { runId: connection.instanceId } });
  for (const args of [[], ['state', 'extra'], ['run', 'custom'], ['pin', '../file'], ['shell']]) {
    assert.throws(() => controlRequest(args), /Usage:/);
  }
  const summary = summarizeState({
    status: 'succeeded', token: 'not-for-output',
    result: { id: 'demo', preset: 'still', pixels: [[1]], figure: {}, token: 'hidden' }
  });
  assert.equal(summary.result.id, 'demo');
  assert.ok(!JSON.stringify(summary).includes('token'));
  assert.ok(!JSON.stringify(summary).includes('pixels'));
});
async function temporary(t) {
  const directory = await mkdtemp(join(tmpdir(), 'scanlab-launcher-'));
  t.after(() => rm(directory, { recursive: true, maxRetries: 5, retryDelay: 100 }));
  return directory;
}

test('runtime paths are absolute and independent of the invoking working directory', () => {
  const runtime = juliaRuntime(root, join(root, 'scanlab'));
  assert.ok(runtime.args.includes(`--project=${join(root, 'scanlab')}`));
  assert.ok(runtime.env.JULIA_DEPOT_PATH);
});

test('read actions remain GET even if a host supplies an empty object', async (t) => {
  const methods = [];
  const server = createServer((req, res) => {
    methods.push(req.method);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ instanceId: connection.instanceId, status: 'idle' }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }));
  const value = { ...connection, url: `http://127.0.0.1:${server.address().port}` };
  await callBackend(value, 'state', {});
  await callBackend(value, 'compare', {});
  assert.deepEqual(methods, ['GET', 'GET']);
  const stateDirectory = await temporary(t);
  await writeFile(join(stateDirectory, 'active.json'), JSON.stringify(value));
  const attached = await startBackend(root, { stateDirectory });
  assert.equal(attached.owned, false);
  await attached.stop();
  assert.equal(server.listening, true);
  assert.equal(JSON.parse(await readFile(join(stateDirectory, 'active.json'), 'utf8')).instanceId, value.instanceId);
});

test('missing runtime fails explicitly and releases only its own startup lock', async (t) => {
  const stateDirectory = await temporary(t);
  const original = process.env.JULIA_EXE;
  process.env.JULIA_EXE = join(stateDirectory, 'not-installed.exe');
  try {
    await assert.rejects(startBackend(root, { stateDirectory }), /Could not launch Julia/);
    await assert.rejects(readFile(join(stateDirectory, 'starting.lock')), { code: 'ENOENT' });
  } finally {
    if (original === undefined) delete process.env.JULIA_EXE;
    else process.env.JULIA_EXE = original;
  }
});

test('concurrent startup does not overwrite a lock or an isolated test session', async (t) => {
  const stateDirectory = await temporary(t);
  await mkdir(stateDirectory, { recursive: true });
  await writeFile(join(stateDirectory, 'starting.lock'), 'other owner');
  await assert.rejects(startBackend(root, { stateDirectory }), /already in progress/);
  assert.equal(await readFile(join(stateDirectory, 'starting.lock'), 'utf8'), 'other owner');
  await writeFile(join(stateDirectory, 'active.json'), JSON.stringify({ ...connection, url: 'http://127.0.0.1:12345' }));
  await assert.rejects(startBackend(root, { stateDirectory, reuse: false }), /refusing to replace/);
});
