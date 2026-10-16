import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Submit request' })).toBeEnabled();
});

test('submits a request using labeled controls and announces success', async ({ page }) => {
  await page.getByLabel('Requester name').fill('Demo Analyst');
  await page.getByLabel('Description').fill('Synthetic browser request');
  await page.getByRole('button', { name: 'Submit request' }).click();
  await expect(page.getByRole('status')).toHaveText('Request submitted.');
  await expect(page.locator('#requests')).toContainText('Demo Analyst');
  await expect(page.locator('#requests')).toContainText('Synthetic browser request');
});

test('renders user text literally rather than as HTML', async ({ page }) => {
  await page.getByLabel('Requester name').fill('<img src=x onerror=alert(1)>');
  await page.getByLabel('Description').fill('<script>not executable</script>');
  await page.getByRole('button', { name: 'Submit request' }).click();
  await expect(page.getByRole('status')).toHaveText('Request submitted.');
  await expect(page.locator('#requests')).toContainText('<script>not executable</script>');
  await expect(page.locator('#requests img, #requests script')).toHaveCount(0);
});

test('preserves values and exposes a network failure', async ({ page }) => {
  await page.route('**/api/requests', (route) =>
    route.request().method() === 'POST' ? route.abort('failed') : route.continue());
  await page.getByLabel('Requester name').fill('Network Demo');
  await page.getByLabel('Description').fill('Retain me');
  await page.getByRole('button', { name: 'Submit request' }).click();
  await expect(page.getByRole('alert')).toContainText('Could not submit request:');
  await expect(page.getByLabel('Requester name')).toHaveValue('Network Demo');
  await expect(page.getByLabel('Description')).toHaveValue('Retain me');
  await expect(page.getByRole('status')).toBeEmpty();
});

test('rejects blank names accessibly, creates nothing, and clears errors on correction', async ({ page, request }) => {
  const count = (await (await request.get('/api/requests')).json()).requests.length;
  const name = page.getByLabel('Requester name');
  for (const value of ['', ' \t ']) {
    await name.fill(value);
    await page.getByRole('button', { name: 'Submit request' }).click();
    await expect(page.locator('#name-error')).toHaveText('Requester name is required.');
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(name).toHaveAttribute('aria-describedby', 'name-error');
    await expect(name).toBeFocused();
    expect((await (await request.get('/api/requests')).json()).requests).toHaveLength(count);
  }
  await name.fill('  Corrected Demo  ');
  await expect(page.locator('#name-error')).toBeEmpty();
  await expect(name).not.toHaveAttribute('aria-invalid', 'true');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Description')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Submit request' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Request submitted.');
  await expect(page.locator('#requests strong').last()).toHaveText('Corrected Demo');
});

test('server field rejection is associated with the name and preserves values', async ({ page }) => {
  await page.route('**/api/requests', (route) => route.request().method() === 'POST' ?
    route.fulfill({
      status: 400, contentType: 'application/json',
      body: JSON.stringify({ error: { field: 'requesterName', message: 'Requester name is required.' } })
    }) : route.continue());
  await page.getByLabel('Requester name').fill('Server Demo');
  await page.getByLabel('Description').fill('Preserve this');
  await page.getByRole('button', { name: 'Submit request' }).click();
  await expect(page.locator('#name-error')).toHaveText('Requester name is required.');
  await expect(page.getByLabel('Requester name')).toBeFocused();
  await expect(page.getByLabel('Description')).toHaveValue('Preserve this');
  await expect(page.getByRole('status')).toBeEmpty();
});
