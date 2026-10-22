import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BRIGHTNESS, CONTRAST, STAGES, STEPS, ZOOM, actorKey, actorName, activitySentence, buildPullRequestNote, canCompare,
  cellAt, clamp, coachLine, currentStep, describeChange, differenceMap, fingerprint, formatPercent, formatTinyPercent,
  grayWindow, panLimit, presetBlurb, presetFor, readoutText, recentActivity, relativeTime, runButtonLabel,
  savedFileCheck, shortId, stageStates, statusLine, stepStates, suggestedPrompts, viewRange
} from '../../public/scanlab/story.js';

const presets = [
  { id: 'still', label: 'No motion', motionMm: 0 },
  { id: 'gentle', label: 'Controlled shift', motionMm: 8 },
  { id: 'larger', label: 'Larger shift', motionMm: 16 }
];

const scan = (id, preset, extra = {}) => ({
  id, preset, label: presets.find((item) => item.id === preset)?.label, requestedBy: 'you',
  computeSeconds: 4.25, roundtripSeconds: 0.25,
  dicom: {
    bitsStored: 16, fileHash: 'a'.repeat(64), decodedPixelHash: 'b'.repeat(64),
    storedPixelsExact: true, maxAbsoluteError: 7.6584e-6, errorBound: 7.6588e-6
  },
  ...extra
});

const changes = {
  sameRun: false, identical: false, threshold: 0.05, totalPixels: 9216, changedPixels: 2500,
  changedPixelsPercent: 27.126736, meanChangePercent: 3.4, maxChangePercent: 38.2
};

const blank = { presets, status: 'idle', selectedPreset: 'still', result: null, baseline: null, changes: null, activity: [] };
const reference = scan('11111111-reference', 'still');
const later = scan('22222222-new-scan', 'gentle');

// A state at each of the four steps the page walks through.
const stateAt = (step, extra = {}) => ({
  ...blank,
  ...[
    {},
    { result: reference },
    { result: reference, baseline: reference, changes: { ...changes, sameRun: true } },
    { result: later, baseline: reference, selectedPreset: 'gentle', changes }
  ][step],
  ...extra
});

test('the four steps follow what has really happened', () => {
  assert.equal(STEPS.length, 4);
  assert.deepEqual([null, {}, blank].map(currentStep), [0, 0, 0]);
  assert.deepEqual([0, 1, 2, 3].map((step) => currentStep(stateAt(step))), [0, 1, 2, 3]);
  assert.deepEqual(stepStates(stateAt(0)).map((step) => step.state), ['current', 'todo', 'todo', 'todo']);
  assert.deepEqual(stepStates(stateAt(2)).map((step) => step.state), ['done', 'done', 'current', 'todo']);
  assert.deepEqual(stepStates(stateAt(3)).map((step) => step.state), ['done', 'done', 'done', 'current']);
  assert.equal(stepStates(stateAt(1))[1].title, 'Keep it as your reference');
});

test('comparison is only offered when the reference and the new scan are different runs', () => {
  assert.deepEqual([null, ...[0, 1, 2, 3].map((step) => stateAt(step))].map(canCompare), [false, false, false, false, true]);
});

test('the main button says what pressing it will do', () => {
  assert.equal(runButtonLabel(null), 'Take scan');
  assert.equal(runButtonLabel(stateAt(0)), 'Take scan');
  assert.equal(runButtonLabel(stateAt(1)), 'Scan again');
  assert.equal(runButtonLabel(stateAt(0, { status: 'running' })), 'Scanning…');
  assert.equal(runButtonLabel(stateAt(3, { status: 'running' })), 'Scanning…');
});

test('the coach line guides the next action and never overstates a running or failed scan', () => {
  assert.match(coachLine(stateAt(0)), /press Take scan/);
  assert.match(coachLine(stateAt(1)), /Keep as reference/);
  assert.doesNotMatch(coachLine(stateAt(1)), /cleanest/);
  assert.match(coachLine({ ...stateAt(1), result: scan('33333333-moved', 'gentle') }), /No motion makes the cleanest reference/);
  assert.match(coachLine(stateAt(2)), /Choose a different movement/);
  assert.match(coachLine(stateAt(2, { selectedPreset: 'gentle' })), /Press Scan again/);
  assert.match(coachLine(stateAt(3)), /Slide and What changed/);
  assert.match(coachLine(stateAt(3, { changes: { ...changes, identical: true } })), /identical/);
  assert.match(coachLine(stateAt(0, { status: 'running' })), /few seconds/);
  assert.match(coachLine(stateAt(3, { status: 'running' })), /previous scan, not this one/);
  assert.match(coachLine(stateAt(3, { status: 'failed' })), /did not finish.*previous scan/);
});

test('the status line states what is happening and who started a finished scan', () => {
  assert.equal(statusLine(null), 'Connecting to the live experiment…');
  assert.equal(statusLine(stateAt(0)), 'Ready. Nothing has been scanned yet.');
  assert.equal(statusLine(stateAt(0, { status: 'running', selectedPreset: 'gentle' })), 'Scanning “Controlled shift” on this computer…');
  assert.equal(statusLine(stateAt(0, { status: 'running', selectedPreset: 'unknown' })), 'Scanning on this computer…');
  assert.equal(statusLine(stateAt(1, { status: 'failed' })), 'The scan did not finish. Any image on screen is from the previous scan.');
  assert.equal(statusLine(stateAt(1)), 'Scan complete · computed live on this computer in 4.5 s');
  const startedBy = (requestedBy) => statusLine(stateAt(1, { result: scan('44444444', 'still', { requestedBy }) }));
  assert.equal(startedBy('copilot'), 'Scan complete · started by Copilot · computed live on this computer in 4.5 s');
  assert.equal(startedBy('script'), 'Scan complete · started by a script · computed live on this computer in 4.5 s');
  assert.equal(startedBy('you'), 'Scan complete · computed live on this computer in 4.5 s');
});

test('the four save-and-check stages show progress honestly', () => {
  assert.deepEqual(STAGES.map((stage) => stage.key), ['simulating', 'writing', 'reopening', 'verifying']);
  const states = (state) => stageStates(state).map((stage) => stage.state);
  assert.deepEqual(states(stateAt(0, { status: 'running', stage: 'simulating' })), ['active', 'waiting', 'waiting', 'waiting']);
  assert.deepEqual(states(stateAt(0, { status: 'running', stage: 'writing' })), ['done', 'active', 'waiting', 'waiting']);
  assert.deepEqual(states(stateAt(1, { status: 'succeeded', stage: 'complete' })), ['done', 'done', 'done', 'done']);
  assert.deepEqual(states(stateAt(1, { status: 'failed', stage: 'failed' })), ['waiting', 'waiting', 'waiting', 'waiting']);
  assert.deepEqual(states(null), ['waiting', 'waiting', 'waiting', 'waiting']);
});

test('percentages stay readable: no false zeros and no false precision', () => {
  const cases = [
    [0, '0%'], [0.04, '<0.1%'], [0.0999, '<0.1%'], [0.1, '0.1%'], [3.456, '3.5%'], [9.94, '9.9%'],
    [9.96, '10%'], [27.4, '27%'], [100, '100%'], [NaN, '—'], [Infinity, '—'], [undefined, '—']
  ];
  for (const [value, text] of cases) assert.equal(formatPercent(value), text, String(value));
  assert.equal(formatTinyPercent(0.00076584), '0.00077%');
  assert.equal(formatTinyPercent(12.345), '12%');
  assert.equal(formatTinyPercent(0), '0%');
  assert.equal(formatTinyPercent(1e-9), '<0.000001%');
  assert.equal(formatTinyPercent(NaN), '—');
});

test('change summaries say it plainly, with no verdicts', () => {
  assert.equal(describeChange(null), null);
  assert.equal(describeChange(undefined), null);
  const same = describeChange({ ...changes, sameRun: true });
  assert.equal(same.kind, 'same-run');
  assert.deepEqual(same.rows, []);
  assert.match(same.headline, /nothing differs yet/);
  const identical = describeChange({ ...changes, identical: true });
  assert.equal(identical.kind, 'identical');
  assert.match(identical.headline, /No pixel is different/);
  const changed = describeChange(changes);
  assert.equal(changed.kind, 'changed');
  assert.equal(changed.headline, '27% of the picture changed noticeably.');
  assert.deepEqual(changed.rows.map((row) => [row.label, row.value]), [
    ['Picture changed', '27%'], ['Average change', '3.4%'], ['Biggest change', '38%']
  ]);
  assert.match(changed.rows[0].note, /more than 5% of the brightness range/);
  const slight = describeChange({ ...changes, changedPixels: 0, changedPixelsPercent: 0, maxChangePercent: 3.2 });
  assert.equal(slight.kind, 'slight');
  assert.match(slight.headline, /Nothing changed noticeably.*at most 3\.2%/);
  assert.equal(slight.rows.length, 3);
});

test('the saved-file check is honest about exactness and about rounding', () => {
  assert.equal(savedFileCheck(null), null);
  assert.equal(savedFileCheck({}), null);
  const good = savedFileCheck(reference);
  assert.equal(good.ok, true);
  assert.equal(good.title, 'Saved file checks out');
  assert.match(good.detail, /opened the file again and compared every pixel/);
  assert.equal(good.rounding, 'Saving rounds each pixel to the nearest of 65,536 brightness levels. No pixel moved by more than 0.00077% of the brightness range.');
  const mismatch = savedFileCheck(scan('a', 'still', { dicom: { ...reference.dicom, storedPixelsExact: false } }));
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.title, 'Saved file does not match');
  assert.match(mismatch.detail, /Do not rely on this scan/);
  assert.equal(savedFileCheck(scan('a', 'still', { dicom: { ...reference.dicom, maxAbsoluteError: 1e-3 } })).ok, false);
});

test('relative times are short and never negative', () => {
  const now = Date.parse('2026-01-01T12:00:00Z');
  const ago = (iso) => relativeTime(iso, now);
  assert.equal(ago('2026-01-01T11:59:58Z'), 'just now');
  assert.equal(ago('2026-01-01T12:00:30Z'), 'just now');
  assert.equal(ago('2026-01-01T11:59:30Z'), '30s ago');
  assert.equal(ago('2026-01-01T11:57:00Z'), '3m ago');
  assert.equal(ago('2026-01-01T09:00:00Z'), '3h ago');
  assert.equal(ago('2025-12-30T12:00:00Z'), '2d ago');
  assert.equal(ago('not a date'), '');
  assert.equal(ago(undefined), '');
});

test('activity entries read as short sentences, whoever made them', () => {
  const entry = (kind, actor, extra = {}) => ({ kind, actor, label: 'No motion', ...extra });
  assert.equal(activitySentence(entry('preset', 'you', { label: 'Controlled shift' })), 'You chose “Controlled shift”.');
  assert.equal(activitySentence(entry('scan_started', 'copilot')), 'Copilot started a scan: “No motion”.');
  assert.equal(activitySentence(entry('scan_done', 'you', { computeSeconds: 4.56 })), 'Your scan finished: “No motion” in 4.6 s.');
  assert.equal(activitySentence(entry('scan_done', 'copilot', { computeSeconds: null })), 'Copilot’s scan finished: “No motion”.');
  assert.equal(activitySentence(entry('scan_failed', 'script')), 'A script’s scan failed: “No motion”. The image on screen is not from that scan.');
  assert.equal(activitySentence(entry('reference_kept', 'you')), 'You kept “No motion” as the reference.');
  assert.equal(activitySentence(entry('reference_kept', 'copilot', { label: undefined })), 'Copilot kept a scan as the reference.');
  assert.equal(activitySentence(entry('mystery', 'mallory')), 'A script did something this page does not recognize.');
  assert.equal(activitySentence(undefined), 'A script did something this page does not recognize.');
});

test('recent activity lists newest first, trims to the limit and treats unknown actors as scripts', () => {
  const activity = [1, 2, 3, 4, 5].map((number) => ({
    kind: 'preset', actor: number === 3 ? 'mallory' : 'you', label: `Preset ${number}`, at: `2026-01-01T12:00:0${number}Z`
  }));
  const recent = recentActivity({ activity }, 3);
  assert.deepEqual(recent.map((item) => item.text), ['You chose “Preset 5”.', 'You chose “Preset 4”.', 'A script chose “Preset 3”.']);
  assert.deepEqual(recent.map((item) => item.actor), ['you', 'you', 'script']);
  assert.equal(recent[0].at, '2026-01-01T12:00:05Z');
  assert.equal(recentActivity({ activity }).length, 5);
  assert.deepEqual(recentActivity(null), []);
  assert.deepEqual(recentActivity({}), []);
});

test('suggested prompts name the canvas, fit the step and ask for real numbers', () => {
  assert.deepEqual([0, 1, 2, 3].map((step) => suggestedPrompts(stateAt(step)).length), [2, 2, 2, 3]);
  for (const step of [0, 1, 2, 3]) {
    for (const prompt of suggestedPrompts(stateAt(step))) {
      assert.match(prompt.text, /^Use the ScanLab canvas/);
      assert.ok(prompt.label.length > 0 && prompt.label.length <= 30, prompt.label);
      assert.doesNotMatch(prompt.text, /token|https?:/i);
    }
  }
  assert.ok(suggestedPrompts(stateAt(0))[0].text.includes('run No motion, keep it as the reference, run Controlled shift'));
  assert.ok(suggestedPrompts(stateAt(2)).some((prompt) => /Larger shift/.test(prompt.text)));
  assert.ok(suggestedPrompts(stateAt(3)).some((prompt) => /pull request note/.test(prompt.text)));
  assert.ok(suggestedPrompts(stateAt(3)).every((prompt) => !/diagnos|clinical use|treat/i.test(prompt.text)));
});

test('the pull request note is paste-ready Markdown built from the live state', () => {
  assert.equal(buildPullRequestNote(null), null);
  assert.equal(buildPullRequestNote(stateAt(0)), null);

  const single = buildPullRequestNote(stateAt(1));
  assert.match(single, /^### ScanLab comparison/);
  assert.ok(single.split('\n').includes('| | This scan |'));
  assert.match(single, /No reference was kept, so nothing was compared\./);
  assert.ok(!single.includes('| Reference |'));

  assert.match(buildPullRequestNote(stateAt(2)), /The reference is this scan, so there is nothing to compare yet\./);

  const activity = [
    { kind: 'scan_done', actor: 'you', label: 'No motion', at: '2026-01-01T12:00:00Z', computeSeconds: 4.5 },
    { kind: 'reference_kept', actor: 'you', label: 'No motion', at: '2026-01-01T12:00:05Z' },
    { kind: 'scan_done', actor: 'copilot', label: 'Controlled shift', at: '2026-01-01T12:00:20Z', computeSeconds: 4.6 }
  ];
  const note = buildPullRequestNote(stateAt(3, { activity }));
  const lines = note.split('\n');
  assert.ok(lines.includes('| | Reference | New scan |'));
  assert.ok(lines.includes('| --- | --- | --- |'));
  assert.ok(lines.includes('| Movement | No motion | Controlled shift (8 mm) |'));
  assert.ok(lines.includes('| Run ID | `11111111-reference` | `22222222-new-scan` |'));
  assert.ok(lines.includes('| File fingerprint (SHA-256) | `aaaaaaaaaaaa…` | `aaaaaaaaaaaa…` |'));
  assert.ok(lines.includes('| Pixel fingerprint (SHA-256) | `bbbbbbbbbbbb…` | `bbbbbbbbbbbb…` |'));
  assert.ok(!note.includes('a'.repeat(13)) && !note.includes('b'.repeat(13)), 'fingerprints are shortened');
  assert.match(note, /\*\*What changed\.\*\* 27% of the picture changed noticeably\. A pixel counts as changed when it moves by more than 5% of the brightness range\. Average change 3\.4%; biggest change 38%\./);
  assert.match(note, /\*\*Saved file check\.\*\* We saved this scan as a DICOM file/);
  const history = lines.indexOf('**Who did what.**');
  assert.deepEqual(lines.slice(history + 1, history + 4), [
    '- Your scan finished: “No motion” in 4.5 s.',
    '- You kept “No motion” as the reference.',
    '- Copilot’s scan finished: “Controlled shift” in 4.6 s.'
  ]);
  assert.match(note, /Practice data only\. Not for medical use\./);
  assert.doesNotMatch(note, /token|fileBase64/i);

  const identical = buildPullRequestNote(stateAt(3, { changes: { ...changes, identical: true } }));
  assert.match(identical, /\*\*What changed\.\*\* No pixel is different\./);
  const unknown = buildPullRequestNote({ result: scan('x', 'custom', { label: 'Custom scan' }), presets: [] });
  assert.ok(unknown.split('\n').includes('| Movement | Custom scan |'));
});

test('the difference map is the absolute change, with a color scale that rounds up to the next 5%', () => {
  const found = differenceMap([[0, 0.5], [0.25, 1]], [[0.1, 0.5], [0.5, 0.75]]);
  assert.deepEqual(found.z, [[0.1, 0], [0.25, 0.25]]);
  assert.equal(found.max, 0.25);
  assert.equal(found.scaleMax, 0.25);
  assert.equal(differenceMap([[0, 0]], [[0.31, 0]]).scaleMax, 0.35);
  assert.equal(differenceMap([[0, 0]], [[0.3, 0]]).scaleMax, 0.3);
  const none = differenceMap([[0.5]], [[0.5]]);
  assert.equal(none.max, 0);
  assert.equal(none.scaleMax, 0.05);
  assert.equal(differenceMap([[0]], [[0], [0]]), null);
  assert.equal(differenceMap([[0, 0]], [[0]]), null);
  assert.equal(differenceMap(null, [[0]]), null);
});

test('the gray window moves with brightness and narrows with contrast, within limits', () => {
  assert.deepEqual(grayWindow(), { zmin: 0, zmax: 1 });
  assert.deepEqual(grayWindow({ brightness: 0, contrast: 100 }), { zmin: 0, zmax: 1 });
  const brighter = grayWindow({ brightness: 10, contrast: 200 });
  assert.ok(Math.abs(brighter.zmin - 0.15) < 1e-12 && Math.abs(brighter.zmax - 0.65) < 1e-12, JSON.stringify(brighter));
  assert.deepEqual(grayWindow({ brightness: 999, contrast: 1 }), { zmin: -1, zmax: 1 });
});

test('zoom and pan keep the view inside the picture', () => {
  assert.equal(panLimit(96, 1), 0);
  assert.equal(panLimit(96, 2), 24);
  assert.equal(panLimit(96, 4), 36);
  assert.equal(panLimit(96, 99), 36);
  assert.equal(panLimit(96, 0.1), 0);
  assert.deepEqual(viewRange(96), { x: [-0.5, 95.5], y: [-0.5, 95.5] });
  assert.deepEqual(viewRange(96, { zoom: 2 }), { x: [23.5, 71.5], y: [23.5, 71.5] });
  assert.deepEqual(viewRange(96, { zoom: 4, panX: 100, panY: -100 }), { x: [71.5, 95.5], y: [-0.5, 23.5] });
  assert.deepEqual(viewRange(96, { zoom: 1, panX: 30, panY: 30 }), viewRange(96));
  assert.deepEqual(viewRange(96, { zoom: 40 }), viewRange(96, { zoom: ZOOM.max }));
});

test('the pixel under the pointer follows the visible range', () => {
  const full = viewRange(96);
  assert.deepEqual(cellAt(full, 0.5, 0.5, 96), { column: 48, row: 48 });
  assert.deepEqual(cellAt(full, 0, 0, 96), { column: 0, row: 95 });
  assert.deepEqual(cellAt(full, 1, 1, 96), { column: 95, row: 0 });
  assert.equal(cellAt(full, -0.01, 0.5, 96), null);
  assert.equal(cellAt(full, 0.5, 1.01, 96), null);
  assert.equal(cellAt(full, NaN, 0.5, 96), null);
  const zoomed = viewRange(96, { zoom: 4, panX: 36, panY: 36 });
  assert.deepEqual(cellAt(zoomed, 0.5, 0.5, 96), { column: 84, row: 84 });
  assert.deepEqual(cellAt(zoomed, 1, 0, 96), { column: 95, row: 95 });
});

test('the readout compares the same pixel in both scans, or shows one brightness', () => {
  assert.equal(readoutText(0.43, 0.51), 'Reference 43% → New scan 51% · +8%');
  assert.equal(readoutText(0.51, 0.43), 'Reference 51% → New scan 43% · −8%');
  assert.equal(readoutText(0.5, 0.5), 'Reference 50% → New scan 50% · no change');
  assert.equal(readoutText(undefined, 0.51), 'Brightness 51%');
  assert.equal(readoutText(0.5, undefined), '');
  assert.equal(readoutText(0.5, NaN), '');
});

test('view limits match the controls the page offers', () => {
  assert.deepEqual([ZOOM.min, ZOOM.max, ZOOM.step], [1, 4, 0.25]);
  assert.deepEqual([BRIGHTNESS.min, BRIGHTNESS.max, BRIGHTNESS.step], [-50, 50, 5]);
  assert.deepEqual([CONTRAST.min, CONTRAST.max, CONTRAST.step], [50, 300, 5]);
  assert.deepEqual([clamp(5, 0, 3), clamp(-5, 0, 3), clamp(2, 0, 3)], [3, 0, 2]);
});

test('small helpers shorten ids and hashes and never trust the actor name', () => {
  assert.equal(actorKey('you'), 'you');
  assert.equal(actorKey('copilot'), 'copilot');
  for (const unknown of ['mallory', 'toString', '__proto__', 'constructor', undefined, null, 7]) {
    assert.equal(actorKey(unknown), 'script', String(unknown));
  }
  assert.equal(actorName('copilot'), 'Copilot');
  assert.equal(actorName('nobody'), 'A script');
  assert.equal(shortId('12345678-aaaa-bbbb'), '12345678');
  assert.equal(shortId(undefined), '');
  assert.equal(fingerprint('a'.repeat(64)), 'aaaaaaaaaaaa…');
  assert.equal(fingerprint(undefined), '—');
  assert.equal(fingerprint(''), '—');
  assert.equal(presetFor(stateAt(0), 'gentle').label, 'Controlled shift');
  assert.equal(presetFor(stateAt(0), 'nope'), undefined);
  assert.equal(presetFor(null, 'still'), undefined);
  assert.equal(presetBlurb(presets[0]), 'Perfectly still. Best for a reference.');
  assert.equal(presetBlurb(presets[1]), 'Head moves 8 mm during the scan.');
  assert.equal(presetBlurb(undefined), '');
});
