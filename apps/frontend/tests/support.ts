import { expect, type Page } from '@playwright/test';
import { resolve } from 'node:path';

export async function start(page: Page) {
  await page.goto('/');
  await page.getByLabel('Language / Язык').selectOption('en');
  const created = page.waitForResponse((r) => r.url().endsWith('/documents/create'));
  await page.locator('.toolbar').getByRole('button', { name: /New scenario/ }).click();
  const document = await (await created).json();
  const token = await page.locator('meta[name=war2-session]').getAttribute('content');
  return { id: document.id, headers: { 'X-War2-Session': token! } };
}
export async function importExample(page: Page, name = 'ex/1.w2tr') {
  await page.goto('/');
  await page.getByLabel('Language / Язык').selectOption('en');
  const imported = page.waitForResponse((r) => r.url().endsWith('/documents/import'));
  await page.getByLabel('Import file', { exact: true }).setInputFiles(resolve('../../legacy-audit/source/tr', name));
  const document = await (await imported).json();
  await expect(page.getByRole('heading', { name: document.name, exact: true })).toBeVisible();
  const token = await page.locator('meta[name=war2-session]').getAttribute('content');
  return { document, headers: { 'X-War2-Session': token! } };
}
export async function more(page: Page, name: string) {
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name, exact: true }).click();
}
