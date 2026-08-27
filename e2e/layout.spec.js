import { test, expect } from '@playwright/test';

const open = page => page.goto('/?pihub_demo_access=borrower&source=investor-access');

test('borrower wide dashboard uses a fluid enterprise canvas with aligned topbar rails', async ({ page }) => {
  await page.setViewportSize({ width: 2048, height: 1053 });
  await open(page);
  await expect(page.getByRole('heading', { name: 'Financing overview' })).toBeVisible();
  await expect(page.getByText('PH-2026-0147', { exact: true })).toBeVisible();

  const layout = await page.evaluate(() => {
    const main = document.querySelector('.ph-main');
    const stage = document.querySelector('.ph-route-stage');
    const sidebar = document.querySelector('.ph-sidebar');
    const topbar = document.querySelector('.ph-topbar');
    const workspaceBadge = document.querySelector('.ph-workspace-badge');
    const account = document.querySelector('.ph-user-card');
    const priorityIcon = document.querySelector('.ph-priority-icon');
    const mainRect = main.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const sidebarRect = sidebar.getBoundingClientRect();
    const topbarRect = topbar.getBoundingClientRect();
    const workspaceBadgeRect = workspaceBadge.getBoundingClientRect();
    const accountRect = account.getBoundingClientRect();
    const priorityIconRect = priorityIcon.getBoundingClientRect();
    const mainStyle = getComputedStyle(main);
    return {
      mainWidth: mainRect.width,
      stageWidth: stageRect.width,
      paddingLeft: parseFloat(mainStyle.paddingLeft),
      paddingRight: parseFloat(mainStyle.paddingRight),
      leftGutter: stageRect.left - mainRect.left,
      rightGutter: mainRect.right - stageRect.right,
      workspaceToStageLeft: workspaceBadgeRect.left - stageRect.left,
      accountToStageRight: accountRect.right - stageRect.right,
      sidebarWidth: sidebarRect.width,
      topbarTop: topbarRect.top,
      topbarHeight: topbarRect.height,
      priorityIconWidth: priorityIconRect.width,
      priorityIconHeight: priorityIconRect.height,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  expect(layout.stageWidth).toBeGreaterThan(1700);
  expect(layout.stageWidth).toBeLessThan(1760);
  expect(layout.paddingLeft).toBeGreaterThanOrEqual(40);
  expect(layout.paddingLeft).toBeLessThanOrEqual(42);
  expect(layout.paddingRight).toBeGreaterThanOrEqual(40);
  expect(layout.paddingRight).toBeLessThanOrEqual(42);
  expect(Math.abs(layout.leftGutter - layout.paddingLeft)).toBeLessThanOrEqual(2);
  expect(Math.abs(layout.rightGutter - layout.paddingRight)).toBeLessThanOrEqual(2);
  expect(Math.abs(layout.workspaceToStageLeft)).toBeLessThanOrEqual(2);
  expect(Math.abs(layout.accountToStageRight)).toBeLessThanOrEqual(2);
  expect(layout.sidebarWidth).toBeGreaterThanOrEqual(231);
  expect(layout.sidebarWidth).toBeLessThanOrEqual(233);
  expect(Math.abs(layout.topbarTop)).toBeLessThanOrEqual(1);
  expect(layout.topbarHeight).toBeGreaterThanOrEqual(67);
  expect(layout.topbarHeight).toBeLessThanOrEqual(69);
  expect(layout.priorityIconWidth).toBeGreaterThanOrEqual(35);
  expect(layout.priorityIconWidth).toBeLessThanOrEqual(37);
  expect(layout.priorityIconHeight).toBeGreaterThanOrEqual(35);
  expect(layout.priorityIconHeight).toBeLessThanOrEqual(37);
  expect(layout.overflow).toBeLessThanOrEqual(2);
});

test('skip navigation is keyboard-only and never creates a shell row', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await open(page);

  const skip = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skip).toHaveCSS('position', 'fixed');
  await expect(skip).toHaveCSS('opacity', '0');

  const before = await page.locator('.ph-topbar').boundingBox();
  expect(Math.abs(before?.y || 0)).toBeLessThanOrEqual(1);

  await page.keyboard.press('Tab');
  await expect(skip).toBeFocused();
  await expect(skip).toHaveCSS('opacity', '1');

  const after = await page.locator('.ph-topbar').boundingBox();
  expect(Math.abs(after?.y || 0)).toBeLessThanOrEqual(1);
});

test('borrower overview composition keeps actions, progress and deal metadata in separate alignment lanes', async ({ page }) => {
  await page.setViewportSize({ width: 2048, height: 1053 });
  await open(page);

  const geometry = await page.evaluate(() => {
    const style = selector => getComputedStyle(document.querySelector(selector));
    const rect = selector => document.querySelector(selector)?.getBoundingClientRect();
    const attention = document.querySelector('.ph-attention-row');
    const attentionTitle = attention?.querySelector('span:first-child')?.getBoundingClientRect();
    const attentionStatus = attention?.querySelector('.ph-status')?.getBoundingClientRect();
    const stage = document.querySelector('.ph-stage-step');
    const stageCopy = stage?.querySelector('.ph-stage-copy')?.getBoundingClientRect();
    const stageMeta = stage?.querySelector('.ph-stage-meta')?.getBoundingClientRect();
    const priority = rect('.ph-priority-strip');
    const priorityAction = rect('.ph-priority-strip > .ph-button');
    const dealItem = document.querySelector('.ph-deal-band > div');
    return {
      focusDisplay: style('.ph-focus-row').display,
      priorityDisplay: style('.ph-priority-strip').display,
      panelHeadDisplay: style('.ph-panel-head').display,
      attentionDisplay: style('.ph-attention-row').display,
      stageDisplay: style('.ph-stage-step').display,
      dealItemDisplay: getComputedStyle(dealItem).display,
      attentionSeparated: Boolean(attentionTitle && attentionStatus && attentionTitle.right <= attentionStatus.left + 1),
      stageSeparated: Boolean(stageCopy && stageMeta && stageCopy.right <= stageMeta.left + 1),
      priorityActionInside: Boolean(priority && priorityAction && priorityAction.right <= priority.right && priorityAction.left >= priority.left),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  expect(geometry.focusDisplay).toBe('flex');
  expect(geometry.priorityDisplay).toBe('flex');
  expect(geometry.panelHeadDisplay).toBe('flex');
  expect(geometry.attentionDisplay).toBe('grid');
  expect(geometry.stageDisplay).toBe('grid');
  expect(geometry.dealItemDisplay).toBe('grid');
  expect(geometry.attentionSeparated).toBe(true);
  expect(geometry.stageSeparated).toBe(true);
  expect(geometry.priorityActionInside).toBe(true);
  expect(geometry.overflow).toBeLessThanOrEqual(2);
});

test('borrower cards, filters and actions inherit exact Investor primitives', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await open(page);
  await page.goto('/products');

  await expect(page.getByRole('heading', { name: 'Find financing' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reset filters', exact: true })).toBeVisible();

  const geometry = await page.evaluate(() => {
    const card = document.querySelector('.ph-card');
    const cardHead = card?.querySelector('.ph-card-head');
    const select = document.querySelector('.ph-field select');
    const input = document.querySelector('.ph-field input');
    const action = document.querySelector('.ph-card-head-action .ph-button');
    const table = document.querySelector('.ph-table-wrap');
    const style = node => node ? getComputedStyle(node) : null;
    return {
      cardRadius: style(card)?.borderRadius,
      cardBorder: style(card)?.borderTopWidth,
      cardPadding: style(card)?.paddingTop,
      cardHeadDisplay: style(cardHead)?.display,
      selectHeight: select?.getBoundingClientRect().height,
      selectMinHeight: style(select)?.minHeight,
      selectRadius: style(select)?.borderRadius,
      inputHeight: input?.getBoundingClientRect().height,
      inputMinHeight: style(input)?.minHeight,
      inputRadius: style(input)?.borderRadius,
      actionHeight: action?.getBoundingClientRect().height,
      tableRadius: style(table)?.borderRadius,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  expect(geometry.cardRadius).toBe('12px');
  expect(geometry.cardBorder).toBe('1px');
  expect(geometry.cardPadding).toBe('18px');
  expect(geometry.cardHeadDisplay).toBe('flex');
  expect(geometry.selectMinHeight).toBe('46px');
  expect(geometry.selectRadius).toBe('10px');
  expect(geometry.selectHeight).toBeGreaterThanOrEqual(45);
  expect(geometry.inputMinHeight).toBe('46px');
  expect(geometry.inputRadius).toBe('10px');
  expect(geometry.inputHeight).toBeGreaterThanOrEqual(45);
  expect(geometry.actionHeight).toBeGreaterThanOrEqual(43);
  expect(geometry.actionHeight).toBeLessThanOrEqual(45);
  expect(geometry.tableRadius).toBe('12px');
  expect(geometry.overflow).toBeLessThanOrEqual(2);
});

test('borrower-specific account composition keeps the Investor surface contract', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await open(page);
  await page.goto('/account');
  await expect(page.getByRole('heading', { name: 'Organization account' })).toBeVisible();

  const profile = await page.evaluate(() => {
    const hero = document.querySelector('.borrower-profile-hero');
    const heroStyle = getComputedStyle(hero);
    const edit = document.querySelector('.borrower-profile-actions .ph-button');
    return {
      hasSharedCard: hero.classList.contains('ph-card'),
      radius: heroStyle.borderRadius,
      borderWidth: heroStyle.borderTopWidth,
      background: heroStyle.backgroundColor,
      actionHeight: edit?.getBoundingClientRect().height,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  expect(profile.hasSharedCard).toBe(true);
  expect(profile.radius).toBe('12px');
  expect(profile.borderWidth).toBe('1px');
  expect(profile.background).toBe('rgb(255, 255, 255)');
  expect(profile.actionHeight).toBeGreaterThanOrEqual(43);
  expect(profile.actionHeight).toBeLessThanOrEqual(45);
  expect(profile.overflow).toBeLessThanOrEqual(2);
});

test('borrower compact controls remain touch-safe without document overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await page.goto('/products');
  await expect(page.getByRole('heading', { name: 'Find financing' })).toBeVisible();

  const compact = await page.evaluate(() => {
    const controls = [...document.querySelectorAll('.ph-field input, .ph-field select, .ph-button')]
      .filter(node => node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0)
      .map(node => node.getBoundingClientRect().height);
    return {
      minimumControlHeight: Math.min(...controls),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  expect(compact.minimumControlHeight).toBeGreaterThanOrEqual(44);
  expect(compact.overflow).toBeLessThanOrEqual(2);
});