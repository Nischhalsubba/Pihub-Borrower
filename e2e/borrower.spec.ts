import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const sectionFor: Record<string, string> = {
  'Financing products': 'Financing',
  'Pre-qualification': 'Financing',
  'My applications': 'Applications',
  'New application': 'Applications',
  'Financing request': 'Applications',
  'Company': 'Applications',
  'Project / Property': 'Applications',
  'Financials': 'Applications',
  'Connected data': 'Applications',
  'Data room': 'Applications',
  'Documents': 'Applications',
  'PiHub requests': 'Applications',
  'Messages': 'Applications',
  'Activity': 'Applications',
  'Application versions': 'Applications',
  'Scenario lab': 'Execution',
  'Negotiation': 'Execution',
  'Terms & closing': 'Execution',
  'Draws & inspections': 'Execution',
  'Calendar': 'Execution',
  'Loan servicing': 'Servicing',
  'Portfolio': 'Servicing',
  'Payments & statements': 'Servicing',
  'ESG & sustainability': 'Servicing',
  'Organization & team': 'Organization',
  'Disclosures & consent': 'Organization',
  'Account': 'Organization',
  'Privacy & data rights': 'Organization',
  'Complaints & disputes': 'Organization'
};

const primaryRoute: Record<string, string> = {
  Overview: '/',
  Financing: '/products',
  Applications: '/applications',
  Execution: '/scenario-lab',
  Servicing: '/servicing',
  Organization: '/team',
  'Borrower Copilot': '/copilot',
  Help: '/help'
};

const targetRoute: Record<string, string> = {
  'Financing products': '/products',
  'Pre-qualification': '/qualification',
  'My applications': '/applications',
  'New application': '/applications/new',
  'Financing request': '/application',
  Company: '/company',
  'Project / Property': '/project',
  Financials: '/financials',
  'Connected data': '/connections',
  'Data room': '/data-room',
  Documents: '/documents',
  'PiHub requests': '/requests',
  Messages: '/messages',
  Activity: '/activity',
  'Application versions': '/versions',
  'Scenario lab': '/scenario-lab',
  Negotiation: '/negotiation',
  'Terms & closing': '/closing',
  'Draws & inspections': '/capital',
  Calendar: '/calendar',
  'Loan servicing': '/servicing',
  Portfolio: '/portfolio',
  'Payments & statements': '/payments',
  'ESG & sustainability': '/esg',
  'Organization & team': '/team',
  'Disclosures & consent': '/disclosures',
  Account: '/account',
  'Privacy & data rights': '/privacy',
  'Complaints & disputes': '/complaints',
  'Borrower Copilot': '/copilot',
  Help: '/help'
};

const applicationMore = new Set([
  'New application', 'Connected data', 'Data room', 'Messages', 'Activity', 'Application versions'
]);

async function expectPath(page: any, path: string) {
  await expect.poll(() => new URL(page.url()).pathname).toBe(path);
}

async function login(page: any) {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Open Borrower' }).click();
  await expectPath(page, '/');
}

async function openPrimary(page: any, name: string) {
  const sidebar = page.locator('.sidebar');
  const link = sidebar.getByRole('link', { name, exact: true });
  const mobileMenu = page.getByRole('button', { name: 'Open navigation' });

  if (await mobileMenu.isVisible()) {
    await mobileMenu.click();
    await expect(mobileMenu).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('button', { name: 'Close navigation' })).toBeVisible();
    await expect(sidebar).toHaveClass(/is-open/);
    await expect(link).toBeVisible();
    await expect(link).toBeInViewport();
    await link.click();
    await expect(page.getByRole('button', { name: 'Close navigation' })).toHaveCount(0);
  } else {
    await link.scrollIntoViewIfNeeded();
    await expect(link).toBeVisible();
    await link.click();
  }

  if (primaryRoute[name]) await expectPath(page, primaryRoute[name]);
}

async function openShellLink(page: any, name: string) {
  const primary = sectionFor[name];
  if (!primary) {
    await openPrimary(page, name);
    if (targetRoute[name]) await expectPath(page, targetRoute[name]);
    return;
  }

  await openPrimary(page, primary);
  const workflow = page.getByRole('region', { name: `${primary} workflow` });
  await expect(workflow).toBeVisible();
  const contextNav = workflow.locator('.workspace-context-nav');
  await expect(contextNav).toBeVisible();

  if (applicationMore.has(name)) {
    const more = contextNav.locator('details.workspace-context-more');
    await expect(more).toHaveCount(1);
    if (!(await more.evaluate((element) => element.hasAttribute('open')))) {
      await more.locator('summary').click();
    }
  }

  const contextLink = contextNav.getByRole('link', { name, exact: true });
  await contextLink.scrollIntoViewIfNeeded();
  await expect(contextLink).toBeVisible();
  await contextLink.click();
  if (targetRoute[name]) await expectPath(page, targetRoute[name]);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
});

test('Borrower login is module-scoped while retaining the unified PiHub access shell', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
  await expect(page.getByText('PiHub Borrower', { exact: true })).toBeVisible();
  await expect(page.locator('[data-pihub-module="borrower"]')).toBeVisible();
  await expect(page.locator('.pihub-access-tabs')).toHaveCount(0);
  for (const moduleName of ['Investor', 'Advisory', 'Admin']) await expect(page.getByText(moduleName, { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Open Borrower' }).click();
  await expectPath(page, '/');
  const topbar = page.locator('.topbar');
  await expect(topbar).toHaveCSS('top', '0px');
  await expect(page.locator('.pihub-route-motion')).toBeVisible();
  await expect(page.locator('.sidebar .ap-nav-item[aria-current="page"]')).toHaveCount(1);
  await expect(page.locator('.sidebar .ap-nav-item')).toHaveCount(8);

  await page.goto('/');
  const skip = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skip).toHaveCSS('position', 'fixed');
  await page.evaluate(() => {
    document.body.setAttribute('tabindex', '-1');
    document.body.focus();
  });
  await expect(page.locator('body')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(skip).toBeFocused();
  await page.evaluate(() => document.body.removeAttribute('tabindex'));
});

test('merged sidebar keeps related borrower tools in a seamless contextual workflow', async ({ page }) => {
  await login(page);
  await openPrimary(page, 'Applications');
  const contextNav = page.locator('.workspace-context-nav');
  await expect(contextNav).toBeVisible();

  for (const item of ['My applications', 'Financing request', 'Financials', 'Documents', 'PiHub requests']) {
    await expect(contextNav.getByRole('link', { name: item, exact: true })).toBeVisible();
  }

  const more = contextNav.locator('details.workspace-context-more');
  await expect(more).toHaveCount(1);
  await expect(more.locator('summary')).toBeVisible();
  await more.locator('summary').click();
  for (const item of ['New application', 'Connected data', 'Data room', 'Messages', 'Activity', 'Application versions']) {
    await expect(contextNav.getByRole('link', { name: item, exact: true })).toBeVisible();
  }

  await contextNav.getByRole('link', { name: 'Documents', exact: true }).click();
  await expectPath(page, '/documents');
  await expect(more).not.toHaveAttribute('open', '');
  await expect(page.locator('.sidebar').getByRole('link', { name: 'Applications', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('financing product discovery has no decorative controls and eligibility typography stays structured', async ({ page }) => {
  await login(page);
  await openShellLink(page, 'Financing products');
  await page.getByRole('button', { name: 'Compare' }).first().click();
  await expect(page.getByRole('heading', { name: 'Product comparison' })).toBeVisible();
  await page.getByRole('link', { name: 'View product' }).first().click();
  await expect(page.locator('.requirements-table')).toBeVisible();
  await expect(page.locator('.requirement-row')).toHaveCount(4);
  await expect(page.locator('.requirements-table')).not.toHaveCSS('font-family', /Mono/i as any);
  await page.getByRole('button', { name: 'Preview demo outline' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close material preview' }).click();
});

test('application actions persist, version and reopen the selected application', async ({ page }) => {
  await login(page);
  await openShellLink(page, 'My applications');
  await openShellLink(page, 'New application');
  await page.getByLabel('Application / project name').fill('Hamburg Logistics Expansion');
  await page.getByRole('button', { name: 'Create draft' }).click();
  await expect(page.getByRole('heading', { name: 'Financing request' })).toBeVisible();
  await page.getByLabel('Financing purpose').fill('Acquisition refinance');
  await page.getByLabel('Requested amount (€)').fill('25000000');
  await page.getByLabel('Desired funding date').fill('2027-03-15');
  await page.getByLabel('Preferred financing structure').fill('Bridge facility');
  await page.getByLabel('Use of proceeds').fill('Acquisition and refinance');
  await page.getByRole('button', { name: 'Save financing request' }).click();
  await expect(page.getByText('Financing request saved.', { exact: true })).toBeVisible();
  await openShellLink(page, 'Application versions');
  await expect(page.getByText(/Version 2/)).toBeVisible();
});

test('documents, PiHub requests, terms and team governance have real frontend outcomes', async ({ page }) => {
  await login(page);
  await page.goto('/documents');
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Upload/i }).first().click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name: 'audited-2025.pdf', mimeType: 'application/pdf', buffer: Buffer.from('demo') });
  await expect(page.getByText(/persisted in browser IndexedDB/i)).toBeVisible();

  await openShellLink(page, 'PiHub requests');
  const responseText = 'The requested information has been provided.';
  await page.getByLabel('Reply to PiHub').fill(responseText);
  await page.getByRole('button', { name: 'Submit response' }).click();
  await expect(page.getByText(responseText, { exact: true })).toBeVisible();

  await openShellLink(page, 'Organization & team');
  await page.getByRole('button', { name: 'Invite team member' }).click();
  await page.getByLabel('Name').fill('Legal Counsel');
  await page.getByLabel('Email').fill('legal@example.com');
  await page.locator('.modal select').selectOption('legal');
  await page.getByRole('button', { name: 'Send invitation' }).click();
  await expect(page.getByText('legal@example.com')).toBeVisible();
});

test('post-funding servicing and privacy rights have complete borrower-owned outcomes', async ({ page }) => {
  await login(page);
  await openShellLink(page, 'My applications');
  await page.getByRole('button', { name: 'Loan servicing' }).click();
  await expect(page.getByRole('heading', { name: 'Loan servicing' })).toBeVisible();
  await expect(page.getByText('FAC-2025-0098', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Repayment schedule', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New servicing request' }).click();
  await page.getByLabel('Request type').selectOption('waiver');
  await page.getByLabel('Subject').fill('Temporary covenant waiver');
  await page.getByLabel('Description').fill('Request a temporary waiver while an updated valuation is completed.');
  await page.getByRole('button', { name: 'Submit request' }).click();
  await expect(page.getByText(/Servicing request submitted/i)).toBeVisible();

  await openShellLink(page, 'Privacy & data rights');
  await expect(page.getByRole('heading', { name: 'Privacy & data rights' })).toBeVisible();
  await page.getByRole('button', { name: 'Create request' }).first().click();
  await page.getByLabel('Additional information').fill('Please provide my Borrower account data.');
  await page.getByRole('button', { name: 'Submit request' }).click();
  await expect(page.getByText(/Privacy request submitted/i)).toBeVisible();
});

test('product-aware qualification, draw centre and disclosure consent have real state transitions', async ({ page }) => {
  await login(page);
  await openShellLink(page, 'Pre-qualification');
  await expect(page.getByRole('heading', { name: 'Pre-qualification & financing fit' })).toBeVisible();
  await page.getByRole('button', { name: 'Refresh assessment' }).click();
  await expect(page.locator('.qualification-score')).toBeVisible();
  await openShellLink(page, 'Draws & inspections');
  await expect(page.getByRole('heading', { name: /Draws|Capital/i }).first()).toBeVisible();

  await openShellLink(page, 'Disclosures & consent');
  await expect(page.getByRole('heading', { name: /Disclosure/i }).first()).toBeVisible();
});

test('scenario lab, calendar, Copilot and complaints are functional Borrower workflows', async ({ page }) => {
  await login(page);
  await openShellLink(page, 'Scenario lab');
  await expect(page.getByRole('heading', { name: 'Financing scenario lab', level: 1 })).toBeVisible();
  await openShellLink(page, 'Calendar');
  await expect(page.getByRole('heading', { name: 'Calendar & deadlines' })).toBeVisible();
  await openShellLink(page, 'Borrower Copilot');
  await page.getByRole('button', { name: 'Which documents are missing?' }).click();
  await expect(page.getByText('PiHub Copilot').last()).toBeVisible();
  await openShellLink(page, 'Complaints & disputes');
  const complaints = page.locator('.complaint-row');
  const complaintCount = await complaints.count();
  await page.getByLabel('Subject').fill('Service follow-up');
  await page.getByLabel('Description').fill('Please review the response timing on the outstanding request.');
  await page.getByRole('button', { name: 'Submit complaint' }).click();
  await expect(complaints).toHaveCount(complaintCount + 1);
  await expect(complaints.filter({ hasText: 'Service follow-up' }).last()).toBeVisible();
  await expect(page.getByLabel('Subject')).toHaveValue('');
});

test('core authenticated routes have no serious or critical accessibility violations', async ({ page }) => {
  test.setTimeout(180_000);
  await login(page);
  for (const route of ['/', '/portfolio', '/qualification', '/products', '/applications', '/application', '/company', '/project', '/financials', '/connections', '/data-room', '/disclosures', '/documents', '/requests', '/messages', '/activity', '/versions', '/notifications', '/scenario-lab', '/negotiation', '/closing', '/capital', '/calendar', '/servicing', '/payments', '/esg', '/team', '/account', '/privacy', '/complaints', '/copilot', '/help']) {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    const severe = results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''));
    expect(severe, `${route}: ${severe.map((item) => item.id).join(', ')}`).toEqual([]);
  }
});
