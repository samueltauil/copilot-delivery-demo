import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import dicomParser from 'dicom-parser';

const PRESETS = { still: 'No motion', gentle: 'Controlled shift', larger: 'Larger shift' };
const FAILURE = 'Acquisition or DICOM verification failed. The previous result, if shown, is not this run. See the local diagnostic log.';

// Calls the same JSON API the page uses, with the page's own session capability.
async function api(page, path, body, actor = 'you') {
  return page.evaluate(async ({ path, body, actor }) => {
    const headers = { 'x-scanlab-token': sessionStorage.getItem('scanlab-token') };
    const options = { headers };
    if (body !== undefined) {
      options.method = 'POST';
      options.body = JSON.stringify(body);
      headers['content-type'] = 'application/json';
      headers['x-scanlab-actor'] = actor;
    }
    const response = await fetch(`/api/${path}`, options);
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`${path} failed (${response.status}): ${payload?.error?.message ?? 'no message'}`);
    return payload;
  }, { path, body, actor });
}

const liveState = (page) => api(page, 'state');

async function waitForScan(page) {
  await expect.poll(async () => (await api(page, 'status')).status, { timeout: 120000, intervals: [250] }).not.toBe('running');
  const { status, error } = await api(page, 'status');
  expect(status, error ?? 'The scan did not succeed.').toBe('succeeded');
}

async function scan(page, preset, actor = 'script') {
  await api(page, 'run', { preset }, actor);
  await waitForScan(page);
  return (await liveState(page)).result;
}

// Gets the shared backend into "a reference was kept, then a different scan was taken" without clicking.
async function ensureComparison(page) {
  let live = await liveState(page);
  let changed = false;
  if (live.status === 'running') await waitForScan(page);
  if (!live.baseline) {
    if (live.result?.preset !== 'still') await scan(page, 'still');
    live = await liveState(page);
    await api(page, 'pin', { runId: live.result.id });
    changed = true;
    live = await liveState(page);
  }
  if (!live.changes || live.changes.identical) {
    await scan(page, 'gentle');
    changed = true;
    live = await liveState(page);
  }
  expect(live.changes).toMatchObject({ identical: false, sameRun: false });
  return { live, changed };
}

async function open(page) {
  await page.goto(process.env.SCANLAB_TEST_URL);
  await expect(page.locator('#run')).toBeEnabled({ timeout: 20000 });
}

async function openWithComparison(page) {
  await open(page);
  const { live, changed } = await ensureComparison(page);
  if (changed) {
    await page.reload();
    await expect(page.locator('#run')).toBeEnabled({ timeout: 20000 });
  }
  // A comparison opens on the difference map.
  await expect(page.locator('#difference-image .main-svg').first()).toBeVisible({ timeout: 20000 });
  return live;
}

function trackErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`page error: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console error: ${message.text()}`); });
  return errors;
}

const choose = (page, preset) => page.locator('label.preset', { hasText: PRESETS[preset] }).click();
const mode = (page, name) => page.locator('.segmented label', { hasText: name }).click();
const presetRadio = (page, preset) => page.locator(`input[name="preset"][value="${preset}"]`);

async function plotZ(page, id) {
  await page.waitForFunction((plot) => document.getElementById(plot)?.data?.[0]?.z?.length > 0, id);
  return page.evaluate((plot) => document.getElementById(plot).data[0].z, id);
}

const sideViews = (page) => page.evaluate(() => ['baseline-image', 'current-image'].map((id) => {
  const node = document.getElementById(id);
  return { x: node.layout.xaxis.range, y: node.layout.yaxis.range, zmin: node.data[0].zmin, zmax: node.data[0].zmax };
}));

test('fresh startup has no preloaded or warm-up result', async ({ page }) => {
  await open(page);
  await expect(page.locator('#current-empty')).toBeVisible();
  await expect(page.locator('#baseline-empty')).toBeVisible();
  await expect(page.locator('#current-image')).toBeHidden();
  await expect(page.locator('#baseline-image')).toBeHidden();
  await expect(page.locator('#run-label')).toHaveText('Take scan');
  await expect(page.locator('#pin')).toBeDisabled();
  for (const id of ['zoom-in', 'zoom-out', 'brightness', 'contrast', 'reset-view', 'copy-pr', 'export', 'download-dicom']) {
    await expect(page.locator(`#${id}`)).toBeDisabled();
  }
  await expect(page.locator('.segmented input[value="slide"]')).toBeDisabled();
  await expect(page.locator('.segmented input[value="diff"]')).toBeDisabled();
  await expect(presetRadio(page, 'still')).toBeChecked();
  await expect(page.locator('#step-now')).toHaveText('Step 1 of 4 · Take a scan');
  await expect(page.locator('#coach')).toContainText('Choose how much the head moves');
  await expect(page.locator('#prompts')).toContainText('Run the whole comparison');
  await expect(page.locator('#activity')).toContainText('Nothing yet');
  await expect(page.locator('#integrity-title')).toHaveText('No scan yet');
  expect(await liveState(page)).toMatchObject({ status: 'idle', result: null, baseline: null, changes: null });
});

test('scan, keep a reference, scan again: the reference never changes', async ({ page }) => {
  // Three live 96×96 brain simulations plus full-pixel DICOM verification.
  test.setTimeout(240000);
  const errors = trackErrors(page);
  await open(page);

  await page.locator('#run').click();
  // The page answers at once; it does not wait for the server to say the scan started.
  await expect(page.locator('#run-label')).toHaveText('Scanning…', { timeout: 2000 });
  await expect(page.locator('#run')).toHaveAttribute('aria-busy', 'true');
  await expect(presetRadio(page, 'gentle')).toBeDisabled();
  await expect(page.locator('#coach')).toContainText('Scanning on this computer');
  await expect(page.locator('#status')).toContainText('Scan complete', { timeout: 90000 });
  await expect(page.locator('#current-label')).toHaveText('No motion');
  await expect(page.locator('#run-label')).toHaveText('Scan again');
  await expect(page.locator('#pipeline [data-state="done"]')).toHaveCount(4);
  await expect(page.locator('#step-now')).toHaveText('Step 2 of 4 · Keep it as your reference');
  await expect(page.locator('#integrity-title')).toHaveText('Saved file checks out');
  await expect(page.locator('#activity')).toContainText('You started a scan');

  await page.locator('#pin').click();
  await expect(page.locator('#pin-label')).toHaveText('Reference kept');
  await expect(page.locator('#baseline-label')).toHaveText('No motion');
  await expect(page.locator('#step-now')).toHaveText('Step 3 of 4 · Scan again with movement');
  await expect(page.locator('#activity')).toContainText('You kept “No motion” as the reference.');
  const pinnedCaption = await page.locator('#baseline-caption').textContent();
  const baseline = (await liveState(page)).baseline;
  const baselinePixels = await plotZ(page, 'baseline-image');
  expect(baselinePixels).toEqual(baseline.figure.data[0].z);
  expect(baseline.dicom.storedPixelsExact).toBe(true);
  expect(baseline.dicom.maxAbsoluteError).toBeLessThanOrEqual(baseline.dicom.errorBound);

  for (const preset of ['gentle', 'larger']) {
    await choose(page, preset);
    await expect(presetRadio(page, preset)).toBeChecked();
    await page.locator('#run').click();
    await expect(page.locator('#current-label')).toHaveText(PRESETS[preset], { timeout: 90000 });
    await expect(page.locator('#run-label')).toHaveText('Scan again');
    await expect(page.locator('#baseline-caption')).toHaveText(pinnedCaption);
    const live = await liveState(page);
    expect(live.baseline).toEqual(baseline);
    expect(live.result.preset).toBe(preset);
    expect(live.result.id).not.toBe(baseline.id);
    expect(live.result.dicom.sopInstanceUid).not.toBe(baseline.dicom.sopInstanceUid);
    expect(await plotZ(page, 'baseline-image')).toEqual(baselinePixels);
  }

  const live = await liveState(page);
  expect(live.changes).toMatchObject({ baselineRunId: baseline.id, currentRunId: live.result.id, sameRun: false, identical: false });
  expect(live.changes.changedPixels).toBeGreaterThan(0);
  await expect(page.locator('#step-now')).toHaveText('Step 4 of 4 · See what changed');
  await expect(page.locator('#changes-body .change-headline')).toHaveAttribute('data-kind', /^(slight|changed)$/);
  // The first comparison opens on the difference map, and its scale matches the server's own numbers.
  await expect(page.locator('#panes')).toHaveAttribute('data-mode', 'diff');
  await expect.poll(async () => Number(await page.locator('#difference-image').getAttribute('data-max')))
    .toBeCloseTo(live.changes.maxChangePercent / 100, 6);

  await page.locator('#technical > summary').click();
  await expect(page.locator('#evidence')).toContainText(baseline.id);
  await expect(page.locator('#evidence')).toContainText(live.result.id);
  await page.getByRole('tab', { name: 'DICOM tags' }).click();
  await expect(page.locator('#dicom-tags')).toContainText('SYN');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'How it was made' })).toBeFocused();
  await expect(page.locator('#provenance')).toContainText('manifestHash');
  expect(errors).toEqual([]);
  console.log(`Verified live DICOM comparison: baseline ${baseline.id}; current ${live.result.id}`);
});

test('scanning again with the same movement gives the same picture in a new file', async ({ page }) => {
  test.setTimeout(150000);
  await open(page);
  const { live } = await ensureComparison(page);
  const first = live.baseline;
  const second = await scan(page, first.preset);
  const after = await liveState(page);
  expect(second.id).not.toBe(first.id);
  expect(second.dicom.sopInstanceUid).not.toBe(first.dicom.sopInstanceUid);
  expect(second.dicom.fileHash).not.toBe(first.dicom.fileHash);
  expect(second.dicom.decodedPixelHash).toBe(first.dicom.decodedPixelHash);
  expect(second.resultHash).toBe(first.resultHash);
  expect(after.changes).toMatchObject({ identical: true, sameRun: false, changedPixels: 0, maxChangePercent: 0 });
  await page.reload();
  await expect(page.locator('#changes-body .change-headline')).toHaveAttribute('data-kind', 'identical', { timeout: 20000 });
  await expect(page.locator('#changes-body')).toContainText('No pixel is different');
  await expect(page.locator('#legend-max')).toHaveText('No pixel differs');
  await expect(page.locator('#difference-image')).toHaveAttribute('data-max', '0');
});

test('the saved DICOM file is exactly what the page shows', async ({ page }) => {
  test.setTimeout(150000);
  const { baseline } = await openWithComparison(page);
  await page.locator('#inspect-side').selectOption('baseline');
  const dicomDownload = page.waitForEvent('download');
  await page.locator('#download-dicom').click();
  const file = await dicomDownload;
  expect(file.suggestedFilename()).toBe(`scanlab-${baseline.id}.dcm`);
  const bytes = await readFile(await file.path());
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(baseline.dicom.fileHash);
  // Independent maintained parser checks DICOM.jl's output, not its own JSON.
  const dataset = dicomParser.parseDicom(new Uint8Array(bytes));
  expect(dataset.string('x00080016')).toBe('1.2.840.10008.5.1.4.1.1.7');
  expect(dataset.string('x00080018')).toBe(baseline.dicom.sopInstanceUid);
  expect(dataset.string('x00020003')).toBe(baseline.dicom.sopInstanceUid);
  expect(dataset.string('x0020000d')).toBe(baseline.dicom.studyInstanceUid);
  expect(dataset.string('x0020000e')).toBe(baseline.dicom.seriesInstanceUid);
  expect(dataset.string('x00080064')).toBe('SYN');
  expect(dataset.string('x00020010')).toBe('1.2.840.10008.1.2.1');
  const size = baseline.parameters.resolution;
  expect(size).toBe(96);
  expect(dataset.uint16('x00280010')).toBe(size);
  expect(dataset.uint16('x00280011')).toBe(size);
  expect(dataset.uint16('x00280100')).toBe(16);
  expect(dataset.uint16('x00280103')).toBe(0);
  expect(dataset.elements.x00020000.dataOffset + 4 + dataset.uint32('x00020000'))
    .toBe(dataset.elements.x00080008.dataOffset - 8);
  const slope = Number(dataset.string('x00281053'));
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const offset = dataset.elements.x7fe00010.dataOffset;
  const decodedRows = [];
  for (let row = 0; row < size; row++) {
    const values = [];
    for (let column = 0; column < size; column++) {
      values.push(view.getUint16(offset + 2 * (row * size + column), true) * slope);
    }
    decodedRows.push(values);
  }
  expect(decodedRows).toEqual(baseline.pixels);
  const denied = await page.request.get(new URL(`/api/dicom/${baseline.id}`, process.env.SCANLAB_TEST_URL).href);
  expect(denied.status()).toBe(403);
});

test('zoom, pan, brightness and contrast move every image together', async ({ page }) => {
  test.setTimeout(150000);
  const errors = trackErrors(page);
  await openWithComparison(page);
  await mode(page, 'Side by side');
  await expect(page.locator('#baseline-image .main-svg').first()).toBeVisible();
  await expect(page.locator('#current-image .main-svg').first()).toBeVisible();

  await page.locator('#zoom-in').click();
  await expect(page.locator('#zoom-label')).toHaveText('1.25×');
  await expect.poll(async () => { const [view] = await sideViews(page); return view.x[1] - view.x[0]; }).toBeCloseTo(96 / 1.25, 3);
  let [reference, current] = await sideViews(page);
  expect(current).toEqual(reference);
  for (let step = 0; step < 3; step++) await page.locator('#zoom-in').click();
  await expect.poll(async () => { const [view] = await sideViews(page); return view.x[1] - view.x[0]; }).toBeCloseTo(48, 3);

  // Dragging one image moves both by the same amount.
  const [startView] = await sideViews(page);
  const frame = await page.locator('#pane-current .frame').boundingBox();
  const centerX = frame.x + frame.width / 2;
  const centerY = frame.y + frame.height / 2;
  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await page.mouse.move(centerX - frame.width * 0.2, centerY, { steps: 6 });
  await page.mouse.up();
  await expect.poll(async () => (await sideViews(page))[1].x[0] - startView.x[0]).toBeGreaterThan(8);
  [reference, current] = await sideViews(page);
  expect(current).toEqual(reference);
  expect(current.x[0] - startView.x[0]).toBeLessThan(11);
  expect(current.y).toEqual(startView.y);

  await page.locator('#pane-current .frame').focus();
  await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => (await sideViews(page))[1].x[0] - current.x[0]).toBeCloseTo(-4, 6);
  [reference, current] = await sideViews(page);
  expect(current).toEqual(reference);

  await page.locator('#contrast').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#contrast-value')).toHaveText('105%');
  await expect.poll(async () => { const [view] = await sideViews(page); return view.zmax - view.zmin; }).toBeCloseTo(1 / 1.05, 5);
  [reference, current] = await sideViews(page);
  expect(current).toEqual(reference);

  await page.locator('#brightness').focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => { const [view] = await sideViews(page); return (view.zmin + view.zmax) / 2; }).toBeCloseTo(0.45, 5);
  [reference, current] = await sideViews(page);
  expect(current).toEqual(reference);

  // Hovering one image marks the same spot in the other and reads both numbers.
  const readout = page.locator('#readout');
  await page.mouse.move(centerX, centerY);
  await expect(readout).toContainText(/Reference \d+% → New scan \d+% · /);
  await expect(readout).not.toHaveAttribute('data-idle', /.*/);
  await expect(page.locator('#pane-baseline .crosshair')).toBeVisible();
  await page.mouse.move(2, 2);
  await expect(readout).toHaveAttribute('data-idle', '');

  await page.locator('#pane-current .frame').focus();
  await page.keyboard.press('0');
  await expect(page.locator('#zoom-label')).toHaveText('1×');
  await expect(page.locator('#contrast-value')).toHaveText('100%');
  await expect.poll(async () => { const [view] = await sideViews(page); return [view.x[1] - view.x[0], view.zmin, view.zmax]; }).toEqual([96, 0, 1]);
  [reference, current] = await sideViews(page);
  expect(current).toEqual(reference);

  await page.locator('#zoom-in').click();
  await page.locator('#reset-view').click();
  await expect(page.locator('#zoom-label')).toHaveText('1×');

  const download = page.waitForEvent('download');
  await page.locator('#export').click();
  expect((await download).suggestedFilename()).toMatch(/^scanlab-.*\.json$/);
  expect(errors).toEqual([]);
});

test('slide and difference views show the same two scans', async ({ page }) => {
  test.setTimeout(150000);
  const errors = trackErrors(page);
  const live = await openWithComparison(page);
  await expect(page.locator('#panes')).toHaveAttribute('data-mode', 'diff');
  await expect(page.locator('.segmented input[value="diff"]')).toBeChecked();
  await expect.poll(async () => Number(await page.locator('#difference-image').getAttribute('data-max')))
    .toBeCloseTo(live.changes.maxChangePercent / 100, 6);
  await expect(page.locator('#legend-max')).toHaveText(/^\d+% change$/);

  await mode(page, 'Slide');
  await expect(page.locator('#panes')).toHaveAttribute('data-mode', 'slide');
  const handle = page.locator('#slide-handle');
  await expect(handle).toBeVisible();
  await handle.focus();
  await expect(handle).toHaveAttribute('aria-valuenow', '50');
  await page.keyboard.press('Home');
  await expect(handle).toHaveAttribute('aria-valuenow', '0');
  await page.keyboard.press('End');
  await expect(handle).toHaveAttribute('aria-valuenow', '100');
  await page.keyboard.press('ArrowLeft');
  await expect(handle).toHaveAttribute('aria-valuenow', '98');
  await page.keyboard.press('Shift+ArrowLeft');
  await expect(handle).toHaveAttribute('aria-valuenow', '88');
  await expect(handle).toHaveAttribute('aria-valuetext', '88% reference · 12% new scan');

  const layer = await page.locator('#slide-layer').boundingBox();
  const grip = await handle.boundingBox();
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(layer.x + layer.width * 0.25, grip.y + grip.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect.poll(async () => Number(await handle.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(23);
  expect(Number(await handle.getAttribute('aria-valuenow'))).toBeLessThanOrEqual(27);

  await mode(page, 'Side by side');
  await expect(page.locator('#panes')).toHaveAttribute('data-mode', 'side');
  await expect(page.locator('#baseline-image .main-svg').first()).toBeVisible();
  await expect(page.locator('#current-image .main-svg').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('a running scan answers at once and the page stays alive', async ({ page }) => {
  test.setTimeout(150000);
  await open(page);
  await ensureComparison(page);
  const before = await liveState(page);
  const target = before.selectedPreset === 'larger' ? 'gentle' : 'larger';
  await choose(page, target);
  await expect(presetRadio(page, target)).toBeChecked();
  await page.locator('#run').click();
  await expect(page.locator('#run-label')).toHaveText('Scanning…', { timeout: 2000 });
  await expect(page.locator('#run')).toHaveAttribute('aria-busy', 'true');
  await expect(presetRadio(page, 'still')).toBeDisabled();
  await expect(page.locator('#coach')).toContainText('Scanning on this computer. The image on screen is the previous scan');
  await expect(page.locator('#panes')).toHaveAttribute('data-busy', '');
  await expect(page.locator('#export')).toBeDisabled();

  // While the scan computes, the server must keep answering quickly.
  const probe = await page.evaluate(async () => {
    const token = sessionStorage.getItem('scanlab-token');
    const started = performance.now();
    let seen = 0;
    let slowest = 0;
    let sawRunning = false;
    while (performance.now() - started < 90000) {
      const asked = performance.now();
      const reply = await (await fetch('/api/status', { headers: { 'x-scanlab-token': token } })).json();
      const took = performance.now() - asked;
      if (reply.status === 'running') {
        sawRunning = true;
        seen += 1;
        slowest = Math.max(slowest, took);
      } else if (sawRunning || performance.now() - started > 8000) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return { seen, slowest, sawRunning };
  });
  expect(probe.sawRunning).toBe(true);
  expect(probe.seen).toBeGreaterThanOrEqual(5);
  expect(probe.slowest).toBeLessThan(3000);
  await expect(page.locator('#status')).toContainText('Scan complete', { timeout: 60000 });
  await expect(page.locator('#current-label')).toHaveText(PRESETS[target]);
  await expect(page.locator('#export')).toBeEnabled();
});

test('a quick second click is queued instead of lost', async ({ page }) => {
  test.setTimeout(150000);
  await open(page);
  await ensureComparison(page);
  const before = await liveState(page);
  const target = Object.keys(PRESETS).find((id) => id !== before.result.preset && id !== before.selectedPreset);
  // Both clicks land in the same instant, before the first request has even been sent.
  await page.evaluate((preset) => {
    document.querySelector(`input[name="preset"][value="${preset}"]`).click();
    document.getElementById('run').click();
  }, target);
  await expect.poll(async () => (await liveState(page)).result.id, { timeout: 90000 }).not.toBe(before.result.id);
  const after = await liveState(page);
  expect(after.result.preset).toBe(target);
  expect(after.selectedPreset).toBe(target);
  await expect(page.locator('#current-label')).toHaveText(PRESETS[target]);
  await expect(page.locator('#error')).toHaveText('');
});

test('Copilot actions appear live and are named as Copilot’s', async ({ page }) => {
  test.setTimeout(150000);
  await open(page);
  const before = await liveState(page);
  const target = Object.keys(PRESETS).find((id) => id !== before.selectedPreset);

  await api(page, 'preset', { preset: target }, 'copilot');
  await expect(presetRadio(page, target)).toBeChecked({ timeout: 10000 });
  await expect(page.locator('#activity')).toContainText(`Copilot chose “${PRESETS[target]}”`, { timeout: 10000 });

  await api(page, 'run', { preset: target }, 'copilot');
  await expect(page.locator('#run-label')).toHaveText('Scanning…', { timeout: 10000 });
  await expect(page.locator('#activity')).toContainText('Copilot started a scan', { timeout: 10000 });
  await expect(page.locator('#status')).toContainText('started by Copilot', { timeout: 90000 });
  await expect(page.locator('#activity')).toContainText(/Copilot.s scan finished/);
  const after = await liveState(page);
  expect(after.result.requestedBy).toBe('copilot');
  expect(after.activity.at(-1)).toMatchObject({ kind: 'scan_done', actor: 'copilot' });

  // An unknown name is rejected rather than shown as someone.
  await expect(api(page, 'preset', { preset: target }, 'somebody-else')).rejects.toThrow(/Unknown actor/);
});

test('prompts and the pull request note copy to the clipboard', async ({ page, context }) => {
  test.setTimeout(150000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(process.env.SCANLAB_TEST_URL).origin });
  const live = await openWithComparison(page);
  // Windows clipboards store line breaks as CRLF; the text itself must still match exactly.
  const readClipboard = async () => (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n');

  const first = page.locator('#prompts .prompt').first();
  const promptText = (await first.locator('p').textContent()).trim();
  expect(promptText).toContain('Use the ScanLab canvas');
  await first.locator('.copy-btn').click();
  await expect(page.locator('#toast')).toContainText('Copied. Paste it into Copilot.');
  expect(await readClipboard()).toBe(promptText);

  await page.locator('#pr-details > summary').click();
  await expect(page.locator('#pr-preview')).toContainText('### ScanLab comparison');
  await page.locator('#copy-pr').click();
  await expect(page.locator('#toast')).toContainText('Copied. Paste it into your pull request.');
  const note = await readClipboard();
  expect(note).toBe((await page.locator('#pr-preview').textContent()));
  expect(note).toContain('### ScanLab comparison');
  expect(note).toContain('Practice data only. Not for medical use.');
  expect(note).toContain(live.baseline.id);
  expect(note).toContain(live.result.id);
  expect(note).toContain('**What changed.**');
  expect(note).toContain('**Saved file check.**');
});

test('a failed scan says so and never passes an old image off as new', async ({ page }) => {
  await open(page);
  await ensureComparison(page);
  await page.route(/\/api\/(state|status)$/, async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...body, status: 'failed', stage: 'failed', error: FAILURE }) });
  });
  await page.reload();
  await expect(page.locator('#error')).toHaveText(FAILURE, { timeout: 20000 });
  await expect(page.locator('#status')).toHaveText('The scan did not finish. Any image on screen is from the previous scan.');
  await expect(page.locator('#coach')).toContainText('That scan did not finish. Any image on screen is from the previous scan. Try again.');
  await expect(page.locator('#run-label')).toHaveText('Scan again');
  await expect(page.locator('#run')).toBeEnabled();
  await expect(page.locator('#pipeline [data-state="done"]')).toHaveCount(0);
});

test('DICOM download failures remain explicit', async ({ page }) => {
  await open(page);
  await ensureComparison(page);
  await page.reload();
  await expect(page.locator('#download-dicom')).toBeEnabled({ timeout: 20000 });
  await page.route('**/api/dicom/*', (route) => route.fulfill({
    status: 500, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Injected DICOM failure' } })
  }));
  await page.locator('#download-dicom').click();
  await expect(page.getByRole('alert')).toContainText('Could not download DICOM: Injected DICOM failure');
});

test('disconnection disables actions and does not pretend old images are new', async ({ page }) => {
  await open(page);
  await page.route('**/api/state', (route) => route.abort('failed'));
  await page.route('**/api/status', (route) => route.abort('failed'));
  await expect(page.getByRole('alert')).toContainText('Cannot read the live experiment', { timeout: 10000 });
  await expect(page.locator('#status')).toContainText('Existing images are not new results');
  await expect(page.locator('#run')).toBeDisabled();
});

test('launch without a session capability is rejected', async ({ page }) => {
  const url = new URL(process.env.SCANLAB_TEST_URL);
  url.hash = '';
  await page.goto(url.href);
  await expect(page.getByRole('alert')).toContainText('does not belong to the active demo session');
  await expect(page.locator('#run')).toBeDisabled();
});

test('an older attached service cannot masquerade as the current workflow', async ({ page }) => {
  await page.route('**/api/state', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'idle' })
  }));
  await page.goto(process.env.SCANLAB_TEST_URL);
  await expect(page.getByRole('alert')).toContainText('This ScanLab service is from an older version. Stop it, start ScanLab again, then reload this page.');
  await expect(page.locator('#run')).toBeDisabled();
});

test('keyboard users can skip straight to the images', async ({ page }) => {
  await open(page);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to the scan images' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#stage')).toBeFocused();
});

for (const [width, height] of [[1440, 900], [1024, 800], [768, 900], [520, 900], [390, 844]]) {
  test(`the page fits ${width}px without horizontal scrolling`, async ({ page }, info) => {
    test.setTimeout(150000);
    await page.setViewportSize({ width, height });
    await openWithComparison(page);
    await mode(page, 'Side by side');
    await expect(page.locator('#baseline-image .main-svg').first()).toBeVisible();
    await expect(page.locator('#current-image .main-svg').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const selector of ['#pane-baseline .frame', '#pane-current .frame']) {
      const box = await page.locator(selector).boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
    await page.screenshot({ path: info.outputPath('scanlab.png'), fullPage: true });
  });
}

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('every button, menu and link is large enough to tap', async ({ page }) => {
    test.setTimeout(150000);
    await openWithComparison(page);
    await page.locator('#technical > summary').click();
    await page.locator('#pr-details > summary').click();
    const small = await page.evaluate(() => {
      const targets = '.btn, .icon-btn, .segmented label, .details summary, .preview summary, select, .copy-btn, .footer a, .tab';
      return [...document.querySelectorAll(targets)]
        .map((node) => ({ node, box: node.getBoundingClientRect() }))
        .filter(({ box }) => box.width > 0 && box.height > 0 && box.height < 40)
        .map(({ node, box }) => `${node.tagName.toLowerCase()} “${(node.getAttribute('aria-label') || node.textContent).trim().slice(0, 28)}” is ${Math.round(box.height)}px tall`);
    });
    expect(small).toEqual([]);
  });
});

// Kept last: it leaves a new "Larger shift" scan as the reference.
test('keeping a reference answers at once even when the server is slow', async ({ page }) => {
  test.setTimeout(150000);
  await open(page);
  await ensureComparison(page);
  await scan(page, 'larger');
  await expect(page.locator('#pin-label')).toHaveText('Keep as reference', { timeout: 10000 });

  // Only the waiting is simulated. The real server still keeps the reference.
  await page.route('**/api/pin', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.continue();
  });
  await page.locator('#pin').click();
  await expect(page.locator('#pin-label')).toHaveText('Keeping…', { timeout: 1000 });
  await expect(page.locator('#pin')).toBeDisabled();
  await expect(page.locator('#pin-label')).toHaveText('Reference kept', { timeout: 10000 });
  const after = await liveState(page);
  expect(after.baseline.id).toBe(after.result.id);
  await expect(page.locator('#error')).toHaveText('');
});
