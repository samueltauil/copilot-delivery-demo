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
    call: async (runtime, action, input, options) => { calls.push({ runtime, action, input, options }); return { status: 'idle' }; }
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
  assert.ok(calls.every((call) => call.options.actor === 'copilot'), 'every request is attributed to Copilot');
  await canvas.onClose({ instanceId: 'panel-one' });
  assert.equal(stops, 0);
  await canvas.onClose({ instanceId: 'panel-two' });
  assert.equal(stops, 1);
});

test('Canvas actions return DICOM evidence without encoded file bytes', async () => {
  const dicom = { fileHash: 'abc', byteLength: 10, fileBase64: 'AAAA' };
  const canvas = makeCanvas({
    createCanvas: (options) => options, CanvasError, root: 'unused',
    start: async () => ({ connection, stop: async () => {} }),
    call: async () => ({ result: { id: 'one', dicom }, baseline: { id: 'two', dicom }, history: [{ dicom }] })
  });
  const state = await canvas.actions.find((action) => action.name === 'get_state').handler({ input: {} });
  assert.deepEqual(state.result.dicom, { fileHash: 'abc', byteLength: 10 });
  assert.deepEqual(state.baseline.dicom, { fileHash: 'abc', byteLength: 10 });
  assert.deepEqual(state.history[0].dicom, { fileHash: 'abc', byteLength: 10 });
});

test('Canvas failures are explicit, not successful-looking results', async () => {
  const canvas = makeCanvas({
    createCanvas: (options) => options, CanvasError, root: 'unused',
    start: async () => { throw new Error('Synthetic startup failure'); }
  });
  await assert.rejects(canvas.open({ instanceId: 'panel-one' }), /Synthetic startup failure/);
  await assert.rejects(canvas.actions[0].handler({}), /Synthetic startup failure/);
});

function canvasWith(call, extra = {}) {
  const canvas = makeCanvas({
    createCanvas: (options) => options, CanvasError, root: 'unused',
    start: async () => ({ connection, stop: async () => {} }), call, ...extra
  });
  return (name) => canvas.actions.find((action) => action.name === name);
}

test('agents get a compact view: evidence, changes and activity, but no images or file bytes', async () => {
  const dicom = { fileHash: 'abc', byteLength: 10, fileBase64: 'AAAA' };
  const changes = { changedPixelsPercent: 27.3, maxChangePercent: 38.1 };
  const activity = [{ kind: 'scan_done', actor: 'copilot', label: 'No motion' }];
  const action = canvasWith(async () => ({
    status: 'succeeded', changes, activity,
    result: { id: 'one', figure: { data: [] }, pixels: [[1]], dicom },
    baseline: { id: 'two', figure: {}, pixels: [[0]], dicom }
  }));
  for (const name of ['get_state', 'get_comparison']) {
    const view = await action(name).handler({ input: {} });
    assert.deepEqual(view.changes, changes);
    assert.deepEqual(view.activity, activity);
    assert.deepEqual(view.result, { id: 'one', dicom: { fileHash: 'abc', byteLength: 10 } });
    assert.deepEqual(view.baseline, { id: 'two', dicom: { fileHash: 'abc', byteLength: 10 } });
  }
});

function scriptedScan(statuses) {
  const calls = [];
  let polled = 0;
  return {
    calls,
    call: async (runtime, action, input, options) => {
      calls.push({ action, input, options });
      if (action === 'run') return { runId: 'run-one', preset: input.preset };
      if (action === 'status') return statuses[Math.min(polled++, statuses.length - 1)];
      return {
        status: 'succeeded', changes: null, activity: [],
        result: { id: 'run-one', figure: {}, pixels: [[1]], dicom: { fileHash: 'abc', fileBase64: 'AAAA' } }
      };
    }
  };
}

test('run_experiment waits for the scan only when asked and sends the backend just the preset', async () => {
  const running = { status: 'running', activeRunId: 'run-one' };
  const backend = scriptedScan([running, running, { status: 'succeeded', activeRunId: 'run-one' }]);
  let sleeps = 0;
  const action = canvasWith(backend.call, { sleep: async () => { sleeps++; } });
  const summary = await action('run_experiment').handler({ input: { preset: 'gentle', waitForResult: true } });
  assert.deepEqual(backend.calls.map((call) => call.action), ['run', 'status', 'status', 'status', 'state']);
  assert.deepEqual(backend.calls[0].input, { preset: 'gentle' });
  assert.ok(backend.calls.every((call) => call.options.actor === 'copilot'));
  assert.equal(sleeps, 2);
  assert.equal(summary.runId, 'run-one');
  assert.equal(summary.status, 'succeeded');
  assert.deepEqual(summary.result.dicom, { fileHash: 'abc' });
  assert.ok(!JSON.stringify(summary).includes('pixels'));
  const quick = await action('run_experiment').handler({ input: { preset: 'still' } });
  assert.deepEqual(quick, { runId: 'run-one', preset: 'still' });
  assert.deepEqual(backend.calls.slice(5).map((call) => call.action), ['run']);
});

test('run_experiment says so when the scan has not finished instead of implying success', async () => {
  const backend = scriptedScan([{ status: 'running', activeRunId: 'run-one' }]);
  const action = canvasWith(backend.call, { waitLimitMs: 0, sleep: async () => {} });
  const summary = await action('run_experiment').handler({ input: { preset: 'larger', waitForResult: true } });
  assert.equal(summary.timedOut, true);
  assert.equal(summary.runId, 'run-one');
  assert.match(summary.note, /get_state/);
  assert.ok(!('result' in summary));
  assert.deepEqual(backend.calls.map((call) => call.action), ['run', 'status']);
});

test('run_experiment surfaces backend errors while waiting', async () => {
  const action = canvasWith(async (runtime, name) => {
    if (name === 'run') return { runId: 'run-one' };
    throw new Error('Synthetic status failure');
  }, { sleep: async () => {} });
  await assert.rejects(
    action('run_experiment').handler({ input: { preset: 'gentle', waitForResult: true } }),
    (error) => error.code === 'scanlab_action_failed' && /Synthetic status failure/.test(error.message)
  );
});

test('the run schema accepts one preset and an optional wait, nothing else', () => {
  const schema = canvasWith(async () => ({}))('run_experiment').inputSchema;
  assert.deepEqual(Object.keys(schema.properties).sort(), ['preset', 'waitForResult']);
  assert.deepEqual(schema.required, ['preset']);
  assert.equal(schema.additionalProperties, false);
});

test('get_pr_note drafts evidence from the real state and refuses to invent a scan', async () => {
  const scan = (id, preset, label) => ({
    id, preset, label, requestedBy: 'copilot', computeSeconds: 4.2, roundtripSeconds: 0.3,
    dicom: { fileHash: 'f'.repeat(64), decodedPixelHash: 'a'.repeat(64), bitsStored: 16, storedPixelsExact: true, maxAbsoluteError: 7.6e-6, errorBound: 7.7e-6 }
  });
  const presets = [{ id: 'still', label: 'No motion', motionMm: 0 }, { id: 'gentle', label: 'Controlled shift', motionMm: 8 }];
  const changes = { sameRun: false, identical: false, threshold: 0.05, changedPixels: 10, changedPixelsPercent: 27.3, meanChangePercent: 4.1, maxChangePercent: 38.2 };
  const full = { presets, activity: [], changes, baseline: scan('ref-run', 'still', 'No motion'), result: scan('new-run', 'gentle', 'Controlled shift') };
  const note = await canvasWith(async () => full)('get_pr_note').handler({ input: {} });
  assert.match(note.note, /ScanLab comparison/);
  assert.match(note.note, /ref-run/);
  assert.match(note.note, /new-run/);
  assert.match(note.note, /Controlled shift \(8 mm\)/);
  await assert.rejects(
    canvasWith(async () => ({ result: null, baseline: null }))('get_pr_note').handler({ input: {} }),
    (error) => error.code === 'scanlab_action_failed' && /no completed scan/.test(error.message)
  );
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
