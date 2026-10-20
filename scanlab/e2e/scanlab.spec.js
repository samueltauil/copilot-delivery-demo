import { test, expect } from '@playwright/test';

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
  await open(page);
  await page.getByRole('button', { name: 'Run experiment' }).click();
  await expect(page.locator('#status')).toContainText('Live computation complete', { timeout: 30000 });
  await expect(page.locator('#current-label')).toHaveText('No motion');
  await page.getByRole('button', { name: 'Pin baseline' }).click();
  await expect(page.locator('#baseline-label')).toHaveText('No motion');
  const pinned = await page.locator('#baseline-caption').textContent();
  for (const [preset, label] of [['gentle', 'Controlled shift'], ['larger', 'Larger shift']]) {
    await page.getByLabel('Motion scenario').selectOption(preset);
    await expect(page.getByLabel('Motion scenario')).toHaveValue(preset);
    await page.getByRole('button', { name: 'Run experiment' }).click();
    await expect(page.locator('#current-label')).toHaveText(label, { timeout: 30000 });
    await expect(page.locator('#baseline-caption')).toHaveText(pinned);
  }
  await page.getByLabel('Shared zoom').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#zoom-label')).toHaveText('1.25×');
  const ranges = await page.evaluate(() => ['current-image', 'baseline-image'].map((id) => document.getElementById(id).layout.xaxis.range));
  expect(ranges[0]).toEqual(ranges[1]);
  await page.getByRole('button', { name: 'Reset view' }).click();
  await expect(page.locator('#zoom-label')).toHaveText('1×');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save comparison' }).click();
  expect((await download).suggestedFilename()).toMatch(/^scanlab-.*\.json$/);
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

for (const width of [1280, 520, 390]) {
  test(`image presentation fits ${width}px without horizontal overflow`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page);
    await expect(page.locator('#current-image .main-svg').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath('scanlab.png'), fullPage: true });
  });
}
