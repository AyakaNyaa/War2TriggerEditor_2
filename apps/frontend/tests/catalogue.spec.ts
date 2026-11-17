import { test, expect } from '@playwright/test';
import { start } from './support';

test('favorites and recent commands persist across catalogue and page reopening', async ({ page }) => {
  await start(page);
  const catalogue = page.locator('.toolbar').getByRole('button', { name: 'Command catalogue', exact: true });
  await catalogue.click();
  const item = page.locator('.catalog-row').filter({ has: page.locator('.catalog-item[data-opcode="37"]') });
  await item.getByRole('button', { name: /^Add to favorites:/ }).click();
  await page.getByRole('button', { name: /Favorites/ }).click();
  await expect(page.locator('.catalog-item')).toHaveCount(1);
  await page.locator('.catalog-item[data-opcode="37"]').click();
  await catalogue.click();
  await expect(page.locator('.recent-command')).toHaveCount(1);
  await expect(page.locator('.recent-command')).toContainText('Show message');
  await page.keyboard.press('Escape');
  await page.reload();
  await page.locator('.toolbar').getByRole('button', { name: /New scenario/ }).click();
  await catalogue.click(); await page.keyboard.press('Alt+f');
  await expect(page.locator('.catalog-item')).toHaveCount(1);
  await expect(page.locator('.catalog-item')).toHaveAttribute('data-opcode', '37');
});

test('catalogue supports full keyboard traversal and safe highlighted search', async ({ page }) => {
  await start(page);
  await page.locator('.toolbar').getByRole('button', { name: 'Command catalogue', exact: true }).click();
  const query = page.getByLabel('Search names, groups and descriptions');
  await query.press('ArrowDown');
  const buttons = page.locator('.catalog-item');
  await expect(buttons.first()).toBeFocused();
  await page.keyboard.press('End'); await expect(buttons.last()).toBeFocused();
  await page.keyboard.press('Home'); await expect(buttons.first()).toBeFocused();
  await query.fill('message');
  await expect(page.locator('.catalog-item mark').first()).toBeVisible();
  await query.fill('[.*+?');
  await expect(page.locator('.catalog-empty')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(buttons.first()).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('dialog')).toBeInViewport();
});
