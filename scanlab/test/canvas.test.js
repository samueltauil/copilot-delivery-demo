import assert from 'node:assert/strict';
import test from 'node:test';
import { makeCanvas } from '../../.github/extensions/scanlab/canvas.mjs';
import { validateConnection, browserUrl, callBackend } from '../../scripts/scanlab-backend.js';

const connection = {
  url: 'http://127.0.0.1:43180', token: '11111111-1111-1111-1111-111111111111',
  instanceId: '22222222-2222-2222-2222-222222222222', pid: 123
};
class CanvasError extends Error { constructor(code, message) { super(message); this.code = code; } }

test('Canvas and browser use the same bounded backend and lifecycle', async () => {
  let starts = 0;
  let stops = 0;
  const calls = [];
  const canvas = makeCanvas({
    createCanvas: (options) => options, CanvasError, root: 'unused',
    start: async () => { starts++; return { connection, stop: async () => { stops++; } }; },
    call: async (runtime, action, input) => { calls.push({ runtime, action, input }); return { status: 'idle' }; }
  });
  const opened = await canvas.open({ instanceId: 'panel-one' });
  assert.equal(opened.url, browserUrl(connection));
  await canvas.open({ instanceId: 'panel-two' });
  await canvas.actions.find((action) => action.name === 'run_experiment').handler({ input: { preset: 'gentle' } });
  await canvas.actions.find((action) => action.name === 'pin_baseline').handler({ input: { runId: 'run-one' } });
  assert.equal(starts, 1);
  assert.deepEqual(calls.map((call) => [call.action, call.input]), [
    ['run', { preset: 'gentle' }], ['pin', { runId: 'run-one' }]
  ]);
  assert.equal(calls[0].runtime, connection);
  await canvas.actions.find((action) => action.name === 'get_state').handler({ input: {} });
  await canvas.actions.find((action) => action.name === 'get_comparison').handler({ input: {} });
  assert.deepEqual(calls.slice(2).map((call) => [call.action, call.input]), [
    ['state', undefined], ['compare', undefined]
  ]);
  await canvas.onClose({ instanceId: 'panel-one' });
  assert.equal(stops, 0);
  await canvas.onClose({ instanceId: 'panel-two' });
  assert.equal(stops, 1);
});

test('Canvas failures are explicit, not successful-looking results', async () => {
  const canvas = makeCanvas({
    createCanvas: (options) => options, CanvasError, root: 'unused',
    start: async () => { throw new Error('Synthetic startup failure'); }
  });
  await assert.rejects(canvas.open({ instanceId: 'panel-one' }), /Synthetic startup failure/);
  await assert.rejects(canvas.actions[0].handler({}), /Synthetic startup failure/);
});

test('connection metadata cannot redirect the bridge to arbitrary hosts or commands', async () => {
  assert.equal(validateConnection(connection), connection);
  for (const url of ['https://example.com', 'http://localhost:1234', 'http://127.0.0.1:1234/path', 'http://user@127.0.0.1:1234']) {
    assert.throws(() => validateConnection({ ...connection, url }));
  }
  assert.throws(() => validateConnection({ ...connection, pid: -1 }));
  assert.throws(() => validateConnection({ ...connection, token: 'bad' }));
  await assert.rejects(callBackend(connection, 'shell'), /Unknown ScanLab action/);
});
