import { test, expect } from '@playwright/test';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, join, sep } from 'node:path';
import { more } from './support';

test('file drops import supported files and explain invalid multiple drops', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Language / Язык').selectOption('en');
  await page.evaluate(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([new Uint8Array([254, 237, 0, 253])], 'dropped.w2tr'));
    window.dispatchEvent(new DragEvent('dragenter', { dataTransfer: transfer, cancelable: true }));
  });
  await expect(page.locator('.file-drop-overlay')).toBeVisible();
  await page.evaluate(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([new Uint8Array([254, 237, 0, 253])], 'dropped.w2tr'));
    window.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, cancelable: true }));
  });
  await expect(page.getByRole('heading', { name: 'dropped.w2tr', exact: true })).toBeVisible();
  await expect(page.locator('.file-drop-overlay')).toHaveCount(0);
  await page.evaluate(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['a'], 'one.pud')); transfer.items.add(new File(['b'], 'two.pud'));
    window.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, cancelable: true }));
  });
  await expect(page.getByRole('alert')).toContainText('Drop one file at a time');
  await expect(page.getByRole('heading', { name: 'dropped.w2tr', exact: true })).toBeVisible();
});

test('save details and backup browser reflect a real safe save of a recovered file', async ({ page, context }) => {
  const local = resolve('../../.local');
  mkdirSync(local, { recursive: true });
  const directory = mkdtempSync(join(local, 'receipt-test-'));
  const source = join(directory, 'saved.w2tr');
  const original = Buffer.from([5, 0, 1, 254, 255, 0, 253]);
  writeFileSync(source, original);
  const id = randomUUID();
  const recoveryDir = join(local, 'qa-recovery'); mkdirSync(recoveryDir, { recursive: true });
  const snapshot = join(recoveryDir, id + '.json');
  writeFileSync(snapshot, JSON.stringify({ version: 1,
    source: { name: 'saved.w2tr', path: source, bytes: Array.from(original), hash: createHash('sha256').update(original).digest('hex') },
    commands: [[5, 0, 9]], revision: 1,
  }));
  try {
    await page.goto('/'); await page.getByLabel('Language / Язык').selectOption('en');
    await page.getByRole('button', { name: 'More', exact: true }).click();
    await page.getByRole('button', { name: /Recovery snapshots/ }).click();
    await page.getByLabel('Search recovery snapshots').fill('saved.w2tr');
    await page.getByRole('dialog').getByRole('button', { name: 'Recover', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'saved.w2tr', exact: true })).toBeVisible();
    const saved = page.waitForResponse((response) => response.url().endsWith('/save'));
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    const response = await saved; expect(response.status()).toBe(200);
    const receipt = await response.json();
    expect(readFileSync(receipt.backup).equals(original)).toBe(true);
    expect(Array.from(readFileSync(source))).toEqual([5, 0, 9, 254, 255, 0, 253]);
    await more(page, 'Last save details');
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel('Saved file', { exact: true })).toHaveValue(source);
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await dialog.getByRole('button', { name: 'Copy Saved file', exact: true }).click();
    const status = dialog.locator('.receipt-value').first().getByRole('status');
    await expect(status).toHaveText(/Copied|Select the text/);
    if (await status.textContent() === 'Copied') expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(source);
    await page.keyboard.press('Escape');
    await more(page, 'File backups');
    await expect(page.getByRole('dialog').locator('.recovery-entry')).toHaveCount(1);
    await expect(page.getByRole('dialog')).toContainText('Newest backups first');
  } finally {
    rmSync(snapshot, { force: true });
    if (!resolve(directory).startsWith(local + sep)) throw new Error('Cleanup outside test workspace');
    rmSync(directory, { recursive: true, force: true });
  }
});
