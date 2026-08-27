import { test, expect } from '@playwright/test';

const open = page => page.goto('/?pihub_demo_access=borrower&source=investor-access');

test('borrower wide dashboard uses the exact Investor desktop canvas', async ({ page }) => {
  await page.setViewportSize({ width: 2048, height: 1053 });
  await open(page);
  await expect(page.getByRole('heading', { name: 'Financing overview' })).toBeVisible();

  const layout = await page.evaluate(() => {
    const main = document.querySelector('.ph-main');
    const stage = document.querySelector('.ph-route-stage');
    const priorityIcon = document.querySelector('.ph-priority-icon');
    const mainRect = main.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const priorityIconRect = priorityIcon.getBoundingClientRect();
    const mainStyle = getComputedStyle(main);
    return {
      mainWidth: mainRect.width,
      stageWidth: stageRect.width,
      paddingLeft: parseFloat(mainStyle.paddingLeft),
      paddingRight: parseFloat(mainStyle.paddingRight),
      leftGutter: stageRect.left - mainRect.left,
      rightGutter: mainRect.right - stageRect.right,
      priorityIconWidth: priorityIconRect.width,
      priorityIconHeight: priorityIconRect.height,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  expect(layout.stageWidth).toBeGreaterThanOrEqual(1439);
  expect(layout.stageWidth).toBeLessThanOrEqual(1441);
  expect(layout.paddingLeft).toBe(40);
  expect(layout.paddingRight).toBe(40);
  expect(Math.abs(layout.leftGutter - ((layout.mainWidth - layout.stageWidth) / 2))).toBeLessThanOrEqual(2);
  expect(Math.abs(layout.leftGutter - layout.rightGutter)).toBeLessThanOrEqual(2);
  expect(layout.priorityIconWidth).toBeGreaterThanOrEqual(35);
  expect(layout.priorityIconWidth).toBeLessThanOrEqual(37);
  expect(layout.priorityIconHeight).toBeGreaterThanOrEqual(35);
  expect(layout.priorityIconHeight).toBeLessThanOrEqual(37);
  expect(layout.overflow).toBeLessThanOrEqual(2);
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
