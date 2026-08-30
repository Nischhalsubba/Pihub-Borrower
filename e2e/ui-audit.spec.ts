import { expect, test } from '@playwright/test';

const routes = [
  '/', '/portfolio', '/qualification', '/products', '/applications', '/applications/new',
  '/application', '/company', '/project', '/financials', '/connections', '/data-room',
  '/disclosures', '/documents', '/requests', '/messages', '/activity', '/versions',
  '/notifications', '/scenario-lab', '/negotiation', '/closing', '/capital', '/calendar',
  '/servicing', '/payments', '/esg', '/team', '/account', '/privacy', '/complaints',
  '/copilot', '/help'
];

async function login(page: any) {
  await page.goto('/login');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
  await page.getByRole('button', { name: 'Open Borrower' }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function auditRouteGeometry(page: any, route: string) {
  await page.goto(route);
  await expect(page.locator('.route-stage').first(), `${route} should render a route stage`).toBeVisible();
  const geometry = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) return null;
      const r = element.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
    };
    const cardsOutside = Array.from(document.querySelectorAll('#main-content .card'))
      .filter((element): element is HTMLElement => element instanceof HTMLElement)
      .map((element) => {
        const r = element.getBoundingClientRect();
        return { left: r.left, right: r.right, width: r.width };
      })
      .filter((r) => r.left < -1 || r.right > window.innerWidth + 1 || r.width > window.innerWidth + 1);
    return {
      innerWidth: window.innerWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      stage: rect('.route-stage'),
      context: rect('.workspace-context-shell'),
      main: rect('#main-content'),
      topbarLeft: rect('.pihub-topbar .topbar-left'),
      topbarActions: rect('.pihub-topbar .topbar-actions'),
      cardsOutside
    };
  });

  expect(geometry.scrollWidth, `${route} must not create document-level horizontal scrolling`).toBeLessThanOrEqual(geometry.clientWidth + 2);
  expect(geometry.cardsOutside, `${route} has cards outside the viewport`).toEqual([]);
  expect(geometry.stage?.width ?? 0, `${route} route content should have positive width`).toBeGreaterThan(0);

  if (geometry.stage && geometry.context) {
    const stageCenter = (geometry.stage.left + geometry.stage.right) / 2;
    const contextCenter = (geometry.context.left + geometry.context.right) / 2;
    expect(Math.abs(stageCenter - contextCenter), `${route} contextual navigation and route content must share a center axis`).toBeLessThanOrEqual(2);
    expect(geometry.context.width, `${route} contextual navigation must respect the canonical content width`).toBeLessThanOrEqual(1482);
  }

  if (geometry.innerWidth >= 901 && geometry.topbarLeft && geometry.topbarActions) {
    expect(geometry.topbarLeft.right, `${route} topbar groups must not overlap`).toBeLessThanOrEqual(geometry.topbarActions.left + 1);
  }
}

test('whole Borrower app is geometrically sound at ultrawide desktop', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Geometry audit is deterministic in Chromium; cross-browser accessibility/workflows run separately.');
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 2560, height: 1440 });
  await login(page);
  for (const route of routes) await auditRouteGeometry(page, route);
});

test('whole Borrower app avoids page overflow on mobile', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'One deterministic mobile geometry pass is sufficient in addition to the configured mobile project.');
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  for (const route of routes) await auditRouteGeometry(page, route);
});

test('tablet-width shell controls do not collide', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium');
  await page.setViewportSize({ width: 1024, height: 900 });
  await login(page);
  await auditRouteGeometry(page, '/applications');
});

test('finance tables keep headers, rows and actions on the same grid contract', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium');
  await page.setViewportSize({ width: 1600, height: 1000 });
  await login(page);

  await page.goto('/scenario-lab');
  await expect(page.locator('.offer-impact-head')).toBeVisible();
  await expect(page.locator('.offer-impact-row').first()).toBeVisible();
  const offer = await page.evaluate(() => {
    const head = document.querySelector('.offer-impact-head') as HTMLElement | null;
    const row = document.querySelector('.offer-impact-row') as HTMLElement | null;
    return {
      headChildren: head?.children.length ?? 0,
      rowChildren: row?.children.length ?? 0,
      headGrid: head ? getComputedStyle(head).gridTemplateColumns : '',
      rowGrid: row ? getComputedStyle(row).gridTemplateColumns : ''
    };
  });
  expect(offer.headChildren).toBe(7);
  expect(offer.rowChildren).toBe(7);
  expect(offer.headGrid).not.toBe('none');
  expect(offer.rowGrid).toBe(offer.headGrid);

  await page.goto('/portfolio');
  await expect(page.locator('.portfolio-head')).toBeVisible();
  await expect(page.locator('.portfolio-row').first()).toBeVisible();
  const portfolio = await page.evaluate(() => {
    const head = document.querySelector('.portfolio-head') as HTMLElement | null;
    const row = document.querySelector('.portfolio-row') as HTMLElement | null;
    return {
      headChildren: head?.children.length ?? 0,
      rowChildren: row?.children.length ?? 0,
      headGrid: head ? getComputedStyle(head).gridTemplateColumns : '',
      rowGrid: row ? getComputedStyle(row).gridTemplateColumns : ''
    };
  });
  expect(portfolio.headChildren).toBe(5);
  expect(portfolio.rowChildren).toBe(5);
  expect(portfolio.rowGrid).toBe(portfolio.headGrid);

  await page.goto('/capital');
  await expect(page.getByRole('heading', { name: /Draws|Capital/i }).first()).toBeVisible();
  const draw = await page.locator('.draw-table').count();
  if (draw) {
    await expect(page.locator('.draw-head')).toBeVisible();
    const contract = await page.evaluate(() => {
      const head = document.querySelector('.draw-head') as HTMLElement | null;
      const row = document.querySelector('.draw-row') as HTMLElement | null;
      return {
        headChildren: head?.children.length ?? 0,
        rowChildren: row?.children.length ?? 0,
        headGrid: head ? getComputedStyle(head).gridTemplateColumns : '',
        rowGrid: row ? getComputedStyle(row).gridTemplateColumns : ''
      };
    });
    expect(contract.headChildren).toBe(5);
    if (contract.rowChildren) {
      expect(contract.rowChildren).toBe(5);
      expect(contract.rowGrid).toBe(contract.headGrid);
    }
  }
});

test('dialogs stay inside the viewport and servicing does not duplicate sections', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium');
  await page.setViewportSize({ width: 1366, height: 768 });
  await login(page);

  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'Privacy & data rights' })).toBeVisible();
  await page.getByRole('button', { name: 'Create request' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const dialogGeometry = await dialog.evaluate((element) => {
    const r = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const backdrop = element.parentElement?.getBoundingClientRect();
    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      top: r.top,
      bottom: r.bottom,
      left: r.left,
      right: r.right,
      maxHeight: style.maxHeight,
      overflowY: style.overflowY,
      backdropTop: backdrop?.top ?? null,
      backdropLeft: backdrop?.left ?? null,
      backdropRight: backdrop?.right ?? null,
      backdropBottom: backdrop?.bottom ?? null
    };
  });
  expect(dialogGeometry.backdropTop).toBeLessThanOrEqual(1);
  expect(dialogGeometry.backdropLeft).toBeLessThanOrEqual(1);
  expect(dialogGeometry.backdropRight).toBeGreaterThanOrEqual(dialogGeometry.innerWidth - 1);
  expect(dialogGeometry.backdropBottom).toBeGreaterThanOrEqual(dialogGeometry.innerHeight - 1);
  expect(dialogGeometry.top).toBeGreaterThanOrEqual(0);
  expect(dialogGeometry.bottom).toBeLessThanOrEqual(dialogGeometry.innerHeight + 1);
  expect(dialogGeometry.left).toBeGreaterThanOrEqual(0);
  expect(dialogGeometry.right).toBeLessThanOrEqual(dialogGeometry.innerWidth + 1);
  expect(['auto', 'scroll']).toContain(dialogGeometry.overflowY);
  await page.getByRole('button', { name: 'Close' }).click();

  await page.goto('/servicing');
  await expect(page.getByRole('heading', { name: 'Covenant forecasting' })).toHaveCount(1);
});
