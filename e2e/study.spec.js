import { test, expect } from '@playwright/test';

test('shows the real JuliaHealth aggregate without patient-level data', async ({ page, request }) => {
  const response = await request.get('/api/study');
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({
    study: {
      dataset: 'Eunomia', synthetic: true, conditionConceptId: 28060,
      condition: 'Strep throat (tutorial cohort)', totalPeople: 2694, cohortPeople: 1677
    }
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'A small study. A clear request.' })).toBeVisible();
  await expect(page.locator('#total-people')).toHaveText('2,694');
  await expect(page.locator('#cohort-people')).toHaveText('1,677');
  await expect(page.getByRole('button', { name: 'Submit request' })).toBeEnabled();
});

for (const failure of ['network', 'malformed', 'server']) {
  test(`study ${failure} failure is explicit and does not show fabricated counts`, async ({ page }) => {
    await page.route('**/api/study', (route) => {
      if (failure === 'network') return route.abort('failed');
      return route.fulfill({
        status: failure === 'server' ? 500 : 200,
        contentType: 'application/json',
        body: JSON.stringify(failure === 'server' ? { error: { message: 'Synthetic study unavailable.' } } : { study: { synthetic: false } })
      });
    });
    await page.goto('/');
    await expect(page.locator('#study-error')).toContainText('Could not load the study snapshot:');
    await expect(page.locator('#study-summary')).toBeHidden();
    await expect(page.locator('#total-people')).toBeEmpty();
    await expect(page.getByRole('button', { name: 'Submit request' })).toBeDisabled();
  });
}

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`study and form fit a ${viewport.width}px viewport without horizontal scrolling`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.locator('#study-summary')).toBeVisible();
    await expect(page.getByLabel('Requester name')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('layout.png'), fullPage: true });
  });
}
