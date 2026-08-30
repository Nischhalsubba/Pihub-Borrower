import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
});

test('first login opens the personalized Borrower tour and completion persists', async ({ page }) => {
  await page.getByRole('button', { name: 'Open Borrower' }).click();
  await expect(page).toHaveURL(/\/$/);
  const onboarding = page.getByLabel('PiHub guided onboarding');
  await expect(onboarding).toBeVisible();
  await expect(onboarding.getByRole('heading', { name: /Marta/ })).toBeVisible();
  await expect(onboarding.getByText('Berlin Urban Living GmbH', { exact: true })).toBeVisible();
  await expect(onboarding.getByText('Step 1 of 7', { exact: true })).toBeVisible();

  await onboarding.getByRole('button', { name: /PiHub modules/ }).click();
  await expect(onboarding.getByRole('heading', { name: /How Borrower, Advisory, Admin\/Compliance and Investor work together/ })).toBeVisible();
  for (const moduleName of ['Borrower', 'Advisory', 'Admin / Compliance', 'Investor']) {
    await expect(onboarding.getByText(moduleName, { exact: true }).first()).toBeVisible();
  }
  await expect(onboarding.getByText('Submit an application', { exact: true })).toBeVisible();
  await expect(onboarding.getByText(/Internal underwriting, investment committee and compliance notes stay inside their authorized modules/)).toBeVisible();

  await onboarding.getByRole('button', { name: 'Skip tour' }).click();
  await expect(page.getByRole('heading', { name: 'Financing overview' })).toBeVisible();

  await page.reload();
  await expect(page.locator('.onboarding-stage')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Financing overview' })).toBeVisible();

  await page.goto('/help');
  await page.getByRole('link', { name: 'Open guided tour' }).click();
  await expect(page.getByLabel('PiHub guided onboarding')).toBeVisible();
  await expect(page.getByLabel('PiHub guided onboarding').getByRole('heading', { name: /Marta/ })).toBeVisible();
});
