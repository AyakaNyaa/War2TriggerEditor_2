import { test, expect } from '@playwright/test';
import { start, importExample, more } from './support';

test('appearance preferences persist, scale real text, and reset together', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page.getByLabel('Interface density').selectOption('compact');
  await page.getByLabel('Text size').selectOption('1.3');
  await page.getByLabel('High contrast', { exact: true }).check();
  await page.getByLabel('Show field explanations').uncheck();
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-density', 'compact');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-contrast', 'high');
  await expect.poll(() => page.locator('html').evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeCloseTo(18.2, 1);
  await page.reload();
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await expect(page.getByLabel('Text size')).toHaveValue('1.3');
  await expect(page.getByLabel('Show field explanations')).not.toBeChecked();
  await page.getByRole('button', { name: 'Reset workspace', exact: true }).click();
  await expect(page.getByLabel('Interface density')).toHaveValue('comfortable');
  await expect(page.getByLabel('Text size')).toHaveValue('1');
  await expect(page.getByLabel('High contrast', { exact: true })).not.toBeChecked();
});

test('blocked storage leaves the editor and language control usable', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
    Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
  });
  await start(page);
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('These preferences apply to this session');
  await page.getByLabel('Interface density').selectOption('compact');
  await page.keyboard.press('Escape');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-density', 'compact');
  await expect(page.locator('.builder-start')).toBeVisible();
});

test('invalid saved preferences fall back to a usable workspace', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('war2.workspace.v1', JSON.stringify({ width: 'bad', scale: 900, density: 'unknown', contrast: {}, hints: null })));
  await start(page);
  await expect(page.getByRole('separator', { name: 'Resize panels' })).toHaveAttribute('aria-valuenow', '320');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-density', 'comfortable');
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await expect(page.getByLabel('Text size')).toHaveValue('1');
  await expect(page.getByLabel('High contrast', { exact: true })).not.toBeChecked();
});

test('splitter supports dragging, keyboard limits, persistence and reset without changing bytes', async ({ page }) => {
  const { id, headers } = await start(page);
  const before = await (await page.request.get('/api/v1/documents/' + id + '/export', { headers })).body();
  const splitter = page.getByRole('separator', { name: 'Resize panels' });
  const box = (await splitter.boundingBox())!;
  await page.mouse.move(box.x + 3, box.y + 60); await page.mouse.down();
  await page.mouse.move(box.x + 83, box.y + 60, { steps: 4 }); await page.mouse.up();
  await expect(splitter).toHaveAttribute('aria-valuenow', '400');
  await splitter.focus(); await page.keyboard.press('Home');
  await expect(splitter).toHaveAttribute('aria-valuenow', '220');
  await page.keyboard.press('ArrowRight');
  await expect(splitter).toHaveAttribute('aria-valuenow', '230');
  await page.keyboard.press('End');
  await expect(splitter).toHaveAttribute('aria-valuenow', '480');
  const after = await (await page.request.get('/api/v1/documents/' + id + '/export', { headers })).body();
  expect(after.equals(before)).toBe(true);
  await page.reload();
  await page.locator('.toolbar').getByRole('button', { name: /New scenario/ }).click();
  await expect(splitter).toHaveAttribute('aria-valuenow', '480');
  await splitter.dblclick();
  await expect(splitter).toHaveAttribute('aria-valuenow', '320');
});

test('scenario filters, expansion, keyboard navigation and remembered view preserve the file', async ({ page }) => {
  const { document, headers } = await importExample(page);
  const before = await (await page.request.get('/api/v1/documents/' + document.id + '/export', { headers })).body();
  const roots = document.program.blocks.filter((block: { depth: number }) => block.depth === 0);
  await page.getByLabel('Filter scenario by type').selectOption('repeat');
  await page.getByRole('button', { name: 'Clear filters', exact: true }).first().click();
  await expect(page.locator('.scenario-card')).toHaveCount(roots.length);
  await page.getByRole('button', { name: 'Expand all commands', exact: true }).click();
  await expect(page.locator('.raw-command')).toHaveCount(document.program.instructions.length);
  const nested = roots.find((block: { start: number; end: number }) => block.end > block.start + 1);
  if (nested) {
    await page.locator('.raw-command').nth(nested.start + 1).click();
    await expect(page.locator('.scenario-card').filter({ has: page.locator('.raw-command[aria-current=true]') }).locator('.scenario-card-main')).toHaveAttribute('aria-pressed', 'true');
  }
  await page.getByRole('button', { name: 'Collapse all commands', exact: true }).click();
  await expect(page.locator('.raw-command')).toHaveCount(0);
  const cards = page.locator('.scenario-card-main');
  await cards.first().focus(); await page.keyboard.press('End'); await expect(cards.last()).toBeFocused();
  await page.keyboard.press('Home'); await expect(cards.first()).toBeFocused();
  const search = page.getByRole('textbox', { name: /^Search triggers, settings and text/ });
  await search.fill('set value');
  await expect(page.locator('.scenario-card mark').first()).toBeVisible();
  await search.press('Escape'); await expect(search).toHaveValue('');
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'More', exact: true })).toBeFocused();
  await page.locator('.scenario-controls select').selectOption('groups');
  const after = await (await page.request.get('/api/v1/documents/' + document.id + '/export', { headers })).body();
  expect(after.equals(before)).toBe(true);
  await page.reload();
  await page.getByLabel('Import file', { exact: true }).setInputFiles({ name: 'empty.w2tr', mimeType: 'application/octet-stream', buffer: Buffer.from([254, 237, 0, 253]) });
  await expect(page.locator('.scenario-controls select')).toHaveValue('groups');
});

test('document information shows real map sections and capacity', async ({ page }) => {
  const { document } = await importExample(page, 'capture flag v3.pud');
  await more(page, 'Document information');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('PUD');
  await expect(dialog.locator('tbody tr')).toHaveCount(document.sections.length);
  await expect(dialog.getByRole('cell', { name: 'OILM', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'More', exact: true })).toBeFocused();
  await expect(page.getByRole('progressbar', { name: 'Program capacity', exact: true })).toBeVisible();
});

test('large text remains usable at desktop and phone widths in both languages', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page.getByLabel('Text size').selectOption('1.3');
  await page.keyboard.press('Escape');
  await page.locator('.scenario-header').getByRole('button', { name: /New trigger/ }).click();
  for (const locale of ['en', 'ru']) {
    await page.getByLabel('Language / Язык').selectOption(locale);
    for (const width of [1440, 900, 390]) {
      await page.setViewportSize({ width, height: width === 900 ? 600 : 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (width === 900) await expect(page.locator('.builder-submit button[type=submit]')).toBeInViewport();
      if (width === 390) {
        await page.locator('.more-menu summary').click();
        await expect(page.locator('.more-menu-items')).toBeInViewport({ ratio: 1 });
        await page.keyboard.press('Escape');
      }
    }
  }
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await expect(page.locator('.builder-submit button[type=submit]')).toBeVisible();
});
