import { test, expect } from '@playwright/test';

const CENTRAL_LOGIN = 'https://pihub-investor.vercel.app';
const ADVISORY_ORIGIN = 'https://pihub-advisory-nischhalsubbas-projects.vercel.app';
const stubCentral = async page => page.route(`${CENTRAL_LOGIN}/**`, route => route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Central PiHub sign in</h1>' }));
const open = page => page.goto('/?pihub_demo_access=borrower&source=investor-access');
const routes = [
  ['Financing products', '/products', 'Find financing'],
  ['My applications', '/applications', 'My applications'],
  ['New application', '/applications/new', 'Start a financing application'],
  ['Financing request', '/financing', 'Financing request'],
  ['Corporate information', '/corporate-information', 'Corporate information'],
  ['Project / Property', '/project', 'Project & property'],
  ['Financials', '/financials', 'Financial information'],
  ['Documents', '/documents', 'Document room'],
  ['PiHub requests', '/requests', 'Requests from PiHub'],
  ['Terms & closing', '/closing', 'Terms & closing'],
  ['Account', '/account', 'Organization account'],
];

test('borrower design contract, Investor-style utilities and every destination', async ({ page }) => {
  await open(page);
  await expect(page.locator('.ph-app[data-workspace="borrower"][data-header-variant="investor"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Financing overview' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Open search and command menu/i })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Language selector' })).toBeVisible();
  await expect(page.getByRole('button', { name: /unread notifications/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open account menu' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign out' })).toHaveCount(0);

  if ((page.viewportSize()?.width || 0) > 1320) {
    const design = await page.evaluate(() => {
      const computed = node => getComputedStyle(node);
      const command = computed(document.querySelector('.ph-command-trigger'));
      const language = computed(document.querySelector('.ph-language'));
      const notification = computed(document.querySelector('.ph-icon-button'));
      const account = computed(document.querySelector('.ph-user-card'));
      return {
        size: computed(document.body).fontSize,
        top: computed(document.querySelector('.ph-topbar')).height,
        side: computed(document.querySelector('.ph-sidebar')).width,
        bg: computed(document.querySelector('.ph-sidebar')).backgroundColor,
        commandHeight: command.height,
        languageHeight: language.height,
        notificationHeight: notification.height,
        accountHeight: account.height,
        accountMinWidth: account.minWidth,
      };
    });
    expect(design.size).toBe('15px');
    expect(design.top).toBe('68px');
    expect(design.side).toBe('232px');
    expect(design.bg).toBe('rgb(11, 18, 32)');
    expect(design.commandHeight).toBe('44px');
    expect(design.languageHeight).toBe('42px');
    expect(design.notificationHeight).toBe('44px');
    expect(design.accountHeight).toBe('46px');
    expect(design.accountMinWidth).toBe('218px');
  }

  for (const [label, path, heading] of routes) {
    await page.getByRole('link', { name: label, exact: true }).first().click();
    await expect(page).toHaveURL(new RegExp(`${path.replaceAll('/', '\\/')}(?:\\?.*)?$`));
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(2);
});

test('product discovery starts a product-backed application', async ({ page }) => {
  await open(page);
  await page.goto('/products');
  await page.getByLabel('Credit type').selectOption('Development financing');
  await page.getByLabel('Amount (EUR)').fill('18000000');
  await expect(page.getByText('Senior Development Facility', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Apply' }).first().click();
  await expect(page).toHaveURL(/\/applications\/new\?product=PRD-2401$/);
  await expect(page.getByText(/Selected product: Senior Development Facility/)).toBeVisible();
  await page.getByRole('button', { name: 'Create application' }).click();
  await expect(page).toHaveURL(/\/financing\?created=1$/);
  await page.goto('/applications');
  await expect(page.getByText('Senior Development Facility', { exact: true }).first()).toBeVisible();
});

test('create application starts a clean editable draft', async ({ page }) => {
  await open(page);
  await page.getByRole('link', { name: 'New application', exact: true }).first().click();
  await page.getByLabel('Borrowing company').fill('Neue Wohnbau GmbH');
  await page.getByLabel('Project / transaction').fill('Munich Housing Programme');
  await page.getByLabel('Requested amount (EUR)').fill('22500000');
  await page.getByLabel('Financing purpose').fill('Acquisition and refurbishment financing');
  await page.getByRole('button', { name: 'Create application' }).click();
  await expect(page).toHaveURL(/\/financing\?created=1$/);
  await expect(page.getByRole('heading', { name: 'Financing request' })).toBeVisible();
  await expect(page.getByLabel('Requested amount (EUR)')).toHaveValue('22500000');
  await expect(page.getByText('Application created.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Requested amount (EUR)')).toHaveValue('22500000');
});

test('corporate profile, application inputs and process mutations persist', async ({ page }) => {
  await open(page);
  await page.goto('/corporate-information');
  await page.getByLabel('Service / industry expertise').fill('Residential development, construction and asset management');
  await page.getByLabel('Creditreform').fill('A');
  await page.getByRole('button', { name: 'Mark demo upload' }).first().click();
  await page.getByRole('button', { name: 'Save corporate information' }).click();
  await page.reload();
  await expect(page.getByLabel('Service / industry expertise')).toHaveValue('Residential development, construction and asset management');
  await expect(page.getByLabel('Creditreform')).toHaveValue('A');

  await page.goto('/financing');
  await page.getByLabel('Requested amount (EUR)').fill('19500000');
  await page.getByRole('button', { name: 'Save financing request' }).click();
  await page.reload();
  await expect(page.getByLabel('Requested amount (EUR)')).toHaveValue('19500000');

  await page.goto('/project');
  await page.getByLabel('Residential units').fill('126');
  await page.getByLabel('Expected completion').fill('Q2 2029');
  await page.getByRole('button', { name: 'Save project' }).click();
  await page.reload();
  await expect(page.getByLabel('Residential units')).toHaveValue('126');

  await page.goto('/financials');
  await page.getByLabel('Revenue (EUR)').fill('26750000');
  await page.getByLabel('Sponsor equity (%)').fill('33');
  await page.getByRole('button', { name: 'Save financials' }).click();
  await page.reload();
  await expect(page.getByLabel('Sponsor equity (%)')).toHaveValue('33');

  await page.goto('/documents');
  await page.getByRole('button', { name: 'Mark demo upload' }).first().click();
  await expect(page.getByText('Uploaded', { exact: true }).first()).toBeVisible();
  await page.goto('/requests');
  await page.getByRole('button', { name: 'Mark complete' }).first().click();
  await expect(page.getByText('Complete', { exact: true }).first()).toBeVisible();
});

test('command palette and notification center are functional', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: /Open search and command menu/i }).click();
  await page.getByRole('textbox', { name: 'Search workspace destinations' }).fill('Financing products');
  await page.getByRole('button', { name: /Financing products/ }).click();
  await expect(page).toHaveURL(/\/products$/);
  await page.getByRole('button', { name: /unread notifications/i }).click();
  await expect(page.getByRole('dialog', { name: 'Notification center' })).toBeVisible();
  await page.getByRole('button', { name: /Financial statements required/ }).click();
  await expect(page).toHaveURL(/\/documents$/);
});

test('borrower submission hands the canonical deal to Advisory without credentials in the URL', async ({ page }) => {
  await open(page);
  await page.goto('/financing');
  await page.route(`${ADVISORY_ORIGIN}/**`, route => route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Advisory handoff</h1>' }));
  await page.getByRole('button', { name: 'Submit financing request' }).click();
  await expect(page).toHaveURL(new RegExp(`^${ADVISORY_ORIGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/\\?`));
  const url = new URL(page.url());
  expect(url.searchParams.get('pihub_workflow')).toBeTruthy();
  expect(url.search).not.toMatch(/password|email|token/i);
});

test('borrower account trigger and dropdown match Investor geometry and content', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await open(page);
  const trigger = page.getByRole('button', { name: 'Open account menu' });
  const triggerBox = await trigger.boundingBox();
  expect(triggerBox?.height).toBeGreaterThanOrEqual(45);
  expect(triggerBox?.height).toBeLessThanOrEqual(47);
  expect(triggerBox?.width).toBeGreaterThanOrEqual(218);

  await trigger.click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Profile', exact: true })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Edit Profile', exact: true })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Reset Password', exact: true })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Logout', exact: true })).toBeVisible();
  const menuBox = await menu.boundingBox();
  expect(menuBox?.width).toBeGreaterThanOrEqual(259);
  expect(menuBox?.width).toBeLessThanOrEqual(261);
  expect(Math.abs((menuBox.x + menuBox.width) - (triggerBox.x + triggerBox.width))).toBeLessThanOrEqual(2);
});

test('borrower profile menu routes, profile editing and password reset work end to end', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Open account menu' }).click();
  await page.getByRole('menuitem', { name: 'Edit Profile', exact: true }).click();
  await expect(page).toHaveURL(/\/account\/edit$/);
  await expect(page.getByRole('heading', { name: 'Edit Profile' })).toBeVisible();
  await page.getByLabel('Full name').fill('Nina Berger QA');
  await page.getByRole('button', { name: 'Save Profile' }).click();
  await expect(page.getByText('Profile changes saved locally.')).toBeVisible();
  await expect(page.locator('.ph-user-copy strong')).toHaveText('Nina Berger QA');

  await page.reload();
  await expect(page.locator('.ph-user-copy strong')).toHaveText('Nina Berger QA');
  await page.getByRole('button', { name: 'Open account menu' }).click();
  await page.getByRole('menuitem', { name: 'Profile', exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole('heading', { name: 'Organization account' })).toBeVisible();
  await expect(page.getByRole('main').getByText('Nina Berger QA', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Open account menu' }).click();
  await page.getByRole('menuitem', { name: 'Reset Password', exact: true }).click();
  await expect(page).toHaveURL(/\/account\/security$/);
  await page.getByLabel('Current password').fill('DemoBorrower1!');
  await page.getByLabel('New password', { exact: true }).fill('BorrowerNew1!');
  await page.getByLabel('Confirm new password', { exact: true }).fill('BorrowerNew1!');
  await page.getByRole('button', { name: 'Reset Password', exact: true }).last().click();
  await expect(page.getByText(/Password reset flow completed in demo mode/)).toBeVisible();
});

test('borrower logout remains inside the Investor-style account dropdown', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Open account menu' }).click();
  await expect(page.getByRole('menu')).toBeVisible();
  await stubCentral(page);
  await page.getByRole('menuitem', { name: 'Logout', exact: true }).click();
  await expect(page).toHaveURL(`${CENTRAL_LOGIN}/login/borrower`);
});

test('borrower direct visit redirects centrally', async ({ page }) => {
  await stubCentral(page);
  await page.goto('/');
  await expect(page).toHaveURL(`${CENTRAL_LOGIN}/login/borrower`);
});
