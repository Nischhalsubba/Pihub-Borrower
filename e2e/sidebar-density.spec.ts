import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Open Borrower' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('primary sidebar rows stay compact instead of stretching to fill the viewport', async ({ page }) => {
  const sidebar = page.locator('.sidebar');
  const mobileMenu = page.getByRole('button', { name: 'Open navigation' });

  if (await mobileMenu.isVisible()) {
    await mobileMenu.click();
    await expect(sidebar).toHaveClass(/is-open/);
  }

  const geometry = await sidebar.locator('.ap-nav-item').evaluateAll((items) =>
    items.map((item) => {
      const rect = item.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, height: rect.height };
    })
  );

  expect(geometry).toHaveLength(8);

  for (const row of geometry) {
    expect(row.height).toBeGreaterThanOrEqual(44);
    expect(row.height).toBeLessThanOrEqual(48);
  }

  for (let index = 1; index < geometry.length; index += 1) {
    const gap = geometry[index].top - geometry[index - 1].bottom;
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThanOrEqual(4);
  }
});
