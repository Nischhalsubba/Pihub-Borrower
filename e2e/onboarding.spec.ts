import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
});

test('personalized spotlight tour runs over the real workspace, crosses routes and persists completion', async ({ page }) => {
  await page.getByRole('button', { name: 'Open Borrower' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Financing overview' })).toBeVisible();

  // The Playwright server suppresses automatic coachmarks so unrelated workflow tests stay isolated.
  // Force the same production tour through its supported Help/replay query contract.
  await page.goto('/?tour=1');
  const tour = page.getByLabel('PiHub guided tour');
  await expect(tour).toBeVisible();
  await expect(tour.locator('.product-tour-spotlight')).toBeVisible();
  await expect(tour.getByRole('heading', { name: /Marta/ })).toBeVisible();
  await expect(tour.getByText(/Berlin Urban Living GmbH/)).toBeVisible();
  await expect(tour.getByText('Step 1 of 11', { exact: true })).toBeVisible();

  for (let index = 0; index < 3; index += 1) {
    await tour.getByRole('button', { name: /^Next:/ }).click();
  }
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByRole('heading', { name: 'Financing products' })).toBeVisible();
  await expect(tour.getByRole('heading', { name: 'Choose the financing path before building the full application' })).toBeVisible();
  await expect(tour.locator('.product-tour-spotlight')).toBeVisible();

  for (let index = 0; index < 3; index += 1) {
    await tour.getByRole('button', { name: /^Next:/ }).click();
  }
  await expect(page).toHaveURL(/\/$/);
  await expect(tour.getByRole('heading', { name: 'This is how the other PiHub modules connect to your deal' })).toBeVisible();
  for (const moduleName of ['Borrower', 'Advisory', 'Admin / Compliance', 'Investor']) {
    await expect(tour.getByText(moduleName, { exact: true }).first()).toBeVisible();
  }
  await expect(tour.getByText(/Internal underwriting, investment committee and compliance notes remain private/)).toBeVisible();

  await tour.getByRole('button', { name: 'Skip tour' }).click();
  await expect(page.getByRole('heading', { name: 'Financing overview' })).toBeVisible();
  await expect(page.locator('.product-tour')).toHaveCount(0);

  await page.reload();
  await expect(page.locator('.product-tour')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Financing overview' })).toBeVisible();

  await page.goto('/help');
  await page.getByRole('link', { name: 'Open guided tour' }).click();
  await expect(page.getByLabel('PiHub guided tour')).toBeVisible();
  await expect(page.getByLabel('PiHub guided tour').getByRole('heading', { name: /Marta/ })).toBeVisible();
});
