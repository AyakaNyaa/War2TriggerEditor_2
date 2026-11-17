import { test, expect, type Page } from '@playwright/test';
import { randomUUID, createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const original = [5, 0, 1, 254, 255, 0, 253];

async function previewEdit(page: Page) {
  await page.goto('/');
  await page.getByLabel('Language / Язык').selectOption('en');
  await page.getByLabel('Import file', { exact: true }).setInputFiles({
    name: 'first.w2tr', mimeType: 'application/octet-stream', buffer: Buffer.from(original),
  });
  await expect(page.getByRole('heading', { name: 'first.w2tr' })).toBeVisible();
  await page.locator('.builder-pane input[type=number]').nth(1).fill('2');
  await page.locator('.builder-pane').getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

test('a preview cannot carry edits into another document with the same revision', async ({ page }) => {
  await previewEdit(page);
  page.on('dialog', (dialog) => dialog.accept());
  const bytes = [5, 1, 7, 254, 255, 0, 253];
  const imported = page.waitForResponse((response) => response.url().endsWith('/documents/import'));
  await page.getByLabel('Import file', { exact: true }).setInputFiles({
    name: 'second.w2tr', mimeType: 'application/octet-stream', buffer: Buffer.from(bytes),
  });
  const document = await (await imported).json();
  await expect(page.getByRole('heading', { name: 'second.w2tr' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.builder-pane input[type=number]').nth(1)).toHaveValue('7');
  const token = await page.locator('meta[name=war2-session]').getAttribute('content');
  const output = await page.request.get(`/api/v1/documents/${document.id}/export`, {
    headers: { 'X-War2-Session': token! },
  });
  expect(Array.from(await output.body())).toEqual(bytes);
});

test('preview supports Escape and restores keyboard focus', async ({ page }) => {
  await previewEdit(page);
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Apply changes', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.builder-pane').getByRole('button', { name: 'Preview', exact: true })).toBeFocused();
  await expect(page.getByText('Unapplied changes', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Guide', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Guide', exact: true })).toBeFocused();
});

test('damaged snapshots stay visible while healthy snapshots can still be recovered', async ({ page }) => {
  const directory = resolve('../../.local/qa-recovery');
  mkdirSync(directory, { recursive: true });
  const good = randomUUID();
  const bad = randomUUID();
  const goodPath = resolve(directory, `${good}.json`);
  const badPath = resolve(directory, `${bad}.json`);
  writeFileSync(goodPath, JSON.stringify({
    version: 1, source: { name: 'rescue.w2tr', path: null, bytes: original,
      hash: createHash('sha256').update(Buffer.from(original)).digest('hex') },
    commands: [[5, 0, 9]], revision: 1,
  }));
  writeFileSync(badPath, '{damaged');
  try {
    await page.goto('/');
    await page.getByLabel('Language / Язык').selectOption('en');
    const token = await page.locator('meta[name=war2-session]').getAttribute('content');
    const response = await page.request.get('/api/v1/recoveries', { headers: { 'X-War2-Session': token! } });
    expect(response.status()).toBe(200);
    await page.getByRole('button', { name: 'More', exact: true }).click();
    await page.getByRole('button', { name: /Recovery snapshots/ }).click();
    const dialog = page.getByRole('dialog');
    const damaged = dialog.locator('.recovery-entry').filter({ hasText: bad });
    await expect(damaged).toContainText('The recovery snapshot is damaged');
    await expect(damaged.getByRole('button', { name: 'Recover', exact: true })).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'More', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'More', exact: true }).click();
    await page.getByRole('button', { name: /Recovery snapshots/ }).click();
    await dialog.locator('.recovery-entry').filter({ hasText: 'rescue.w2tr' })
      .getByRole('button', { name: 'Recover', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'rescue.w2tr' })).toBeVisible();
    await expect(page.locator('.builder-pane input[type=number]').nth(1)).toHaveValue('9');
    await expect(page.getByText('Unsaved changes', { exact: true })).toBeVisible();
  } finally {
    rmSync(goodPath, { force: true });
    rmSync(badPath, { force: true });
  }
});
