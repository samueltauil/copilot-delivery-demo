import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import dicomParser from 'dicom-parser';

async function liveState(page) {
  return page.evaluate(async () => {
    const response = await fetch('/api/state', { headers: { 'x-scanlab-token': sessionStorage.getItem('scanlab-token') } });
    if (!response.ok) throw new Error(`State request failed: ${response.status}`);
    return response.json();
  });
}

async function open(page) {
  await page.goto(process.env.SCANLAB_TEST_URL);
  await expect(page.getByRole('button', { name: 'Run experiment' })).toBeEnabled();
}

test('fresh startup has no preloaded or warm-up result', async ({ page }) => {
  await open(page);
  await expect(page.locator('#current-empty')).toBeVisible();
  await expect(page.locator('#current-image')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Pin baseline' })).toBeDisabled();
});

test('three live presets preserve an immutable pinned baseline and synchronize views', async ({ page }) => {
  // Three live 96×96 brain simulations plus full-pixel DICOM verification.
  test.setTimeout(120000);
  await open(page);
  await page.getByRole('button', { name: 'Run experiment' }).click();
  await expect(page.locator('#status')).toContainText('Live computation complete', { timeout: 30000 });
  await expect(page.locator('#current-label')).toHaveText('No motion');
  await page.getByRole('button', { name: 'Pin baseline' }).click();
  await expect(page.locator('#baseline-label')).toHaveText('No motion');
  const pinned = await page.locator('#baseline-caption').textContent();
  const baseline = (await liveState(page)).baseline;
  const baselinePixels = await page.locator('#baseline-image').evaluate((node) => node.data[0].z);
  expect(baseline.dicom.storedPixelsExact).toBe(true);
  expect(baseline.dicom.maxAbsoluteError).toBeLessThanOrEqual(baseline.dicom.errorBound);
  for (const [preset, label] of [['gentle', 'Controlled shift'], ['larger', 'Larger shift']]) {
    await page.getByLabel('Motion scenario').selectOption(preset);
    await expect(page.getByLabel('Motion scenario')).toHaveValue(preset);
    await page.getByRole('button', { name: 'Run experiment' }).click();
    await expect(page.locator('#current-label')).toHaveText(label, { timeout: 30000 });
    await expect(page.locator('#baseline-caption')).toHaveText(pinned);
    const state = await liveState(page);
    expect(state.baseline).toEqual(baseline);
    expect(state.result.id).not.toBe(baseline.id);
    expect(state.result.dicom.sopInstanceUid).not.toBe(baseline.dicom.sopInstanceUid);
    expect(await page.locator('#baseline-image').evaluate((node) => node.data[0].z)).toEqual(baselinePixels);
  }
  await expect(page.locator('#integrity-title')).toHaveText('Stored pixels survived exactly');
  await expect(page.locator('#evidence')).toContainText(baseline.id);
  await page.getByRole('tab', { name: 'DICOM tags' }).click();
  await expect(page.locator('#dicom-tags')).toContainText('SYN');
  await page.getByRole('tab', { name: 'DICOM tags' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Acquisition', exact: true })).toBeFocused();
  await expect(page.locator('#provenance')).toContainText('manifestHash');
  await page.getByLabel('Inspect', { exact: true }).selectOption('baseline');
  const dicomDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download DICOM' }).click();
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
  await page.getByLabel('Shared zoom').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#zoom-label')).toHaveText('1.25×');
  const ranges = await page.evaluate(() => ['current-image', 'baseline-image'].map((id) => document.getElementById(id).layout.xaxis.range));
  expect(ranges[0]).toEqual(ranges[1]);
  await page.getByLabel('Pan X', { exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await page.getByLabel('Window width', { exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  const linked = await page.evaluate(() => ['current-image', 'baseline-image'].map((id) => {
    const node = document.getElementById(id);
    return { range: node.layout.xaxis.range, min: node.data[0].zmin, max: node.data[0].zmax };
  }));
  expect(linked[0]).toEqual(linked[1]);
  expect(linked[0].max - linked[0].min).toBeCloseTo(1.05);
  await page.getByRole('button', { name: 'Reset view' }).click();
  await expect(page.locator('#zoom-label')).toHaveText('1×');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save comparison' }).click();
  expect((await download).suggestedFilename()).toMatch(/^scanlab-.*\.json$/);
  console.log(`Verified live DICOM comparison: baseline ${baseline.id}; current ${(await liveState(page)).result.id}`);
});

test('DICOM download failures remain explicit', async ({ page }) => {
  await open(page);
  await page.route('**/api/dicom/*', (route) => route.fulfill({
    status: 500, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Injected DICOM failure' } })
  }));
  await page.getByRole('button', { name: 'Download DICOM' }).click();
  await expect(page.getByRole('alert')).toContainText('Could not download DICOM: Injected DICOM failure');
});

test('disconnection disables actions and does not pretend old images are new', async ({ page }) => {
  await open(page);
  await page.route('**/api/state', (route) => route.abort('failed'));
  await expect(page.getByRole('alert')).toContainText('Cannot read the live experiment');
  await expect(page.locator('#status')).toContainText('Existing images are not new results');
  await expect(page.getByRole('button', { name: 'Run experiment' })).toBeDisabled();
});

test('launch without a session capability is rejected', async ({ page }) => {
  const url = new URL(process.env.SCANLAB_TEST_URL);
  url.hash = '';
  await page.goto(url.href);
  await expect(page.getByRole('alert')).toContainText('does not belong to the active demo session');
  await expect(page.getByRole('button', { name: 'Run experiment' })).toBeDisabled();
});

test('an older attached service cannot masquerade as a DICOM workflow', async ({ page }) => {
  await page.route('**/api/state', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'idle' })
  }));
  await page.goto(process.env.SCANLAB_TEST_URL);
  await expect(page.getByRole('alert')).toContainText('This service predates the DICOM workbench');
  await expect(page.getByRole('button', { name: 'Run experiment' })).toBeDisabled();
});

for (const width of [1280, 520, 390]) {
  test(`image presentation fits ${width}px without horizontal overflow`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page);
    await expect(page.locator('#current-image .main-svg').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath('scanlab.png'), fullPage: true });
  });
}
