import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
});

test('first login opens the personalized Borrower tour and completion persists', async ({ page }) => {
  await page.getByRole('button', { name: 'Open Borrower' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.onboarding-stage')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Marta/ })).toBeVisible();
  await expect(page.getByText('Berlin Urban Living GmbH', { exact: true })).toBeVisible();
  await expect(page.getByText('Step 1 of 7', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /PiHub modules/ }).click();
  await expect(page.getByRole('heading', { name: /How Borrower, Advisory, Admin\/Compliance and Investor work together/ })).toBeVisible();
  for (const moduleName of ['Borrower', 'Advisory', 'Admin / Compliance', 'Investor']) {
    await expect(page.getByText(moduleName, { exact: true }).first()).toBeVisible();
  }
  await expect(page.getByText('Submit an application', { exact: true })).toBeVisible();
  await expect(page.getByText(/Internal underwriting, investment committee and compliance notes stay inside their authorized modules/)).toBeVisible();

  await page.getByRole('button', { name: 'Skip tour' }).click();
  await expect(page.getByRole('heading', { name: 'Financing overview' })).toBeVisible();

  await page.reload();
  await expect(page.locator('.onboarding-stage')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Financing overview' })).toBeVisible();

  await page.goto('/help');
  await page.getByRole('link', { name: 'Open guided tour' }).click();
  await expect(page.locator('.onboarding-stage')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Marta/ })).toBeVisible();
});
