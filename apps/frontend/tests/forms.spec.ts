import { test, expect } from '@playwright/test';
import { start } from './support';

test('action duplication, reset, removal and keyboard history use the same document', async ({ page }) => {
  const { id, headers } = await start(page);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await page.locator('.scenario-header').getByRole('button', { name: /New trigger/ }).click();
  await page.getByRole('button', { name: 'Duplicate action 1', exact: true }).click();
  await expect(page.locator('.action-editor')).toHaveCount(2);
  await expect(page.locator('.action-editor').nth(1)).toBeFocused();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Reset fields', exact: true }).click();
  await expect(page.locator('.action-editor')).toHaveCount(1);
  await page.getByRole('button', { name: 'Duplicate action 1', exact: true }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Remove action 2', exact: true }).click();
  await expect(page.locator('.action-editor')).toHaveCount(1);
  await page.locator('#condition-amount').fill('5');
  await page.keyboard.press('Control+Enter');
  await expect(page.locator('.scenario-card')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Dismiss notification', exact: true }).click();
  await expect(page.locator('.status-notice')).toHaveCount(0);
  await page.locator('.builder-heading h2').click();
  await page.keyboard.press('Control+z');
  await expect(page.locator('.scenario-card')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Redo', exact: true })).toBeEnabled();
  await page.keyboard.press('Control+y');
  await expect(page.locator('.scenario-card')).toHaveCount(1);
  const before = await (await page.request.get('/api/v1/documents/' + id, { headers })).json();
  await page.locator('#condition-amount').focus();
  await page.keyboard.press('Control+z');
  const after = await (await page.request.get('/api/v1/documents/' + id, { headers })).json();
  expect(after.revision).toBe(before.revision);
});

test('resource and message templates remain editable, with text counts and numeric validation', async ({ page }) => {
  const { id, headers } = await start(page);
  await page.locator('.quick-templates').getByRole('button', { name: /Resource goal/ }).click();
  await expect(page.locator('#condition-kind')).toHaveValue('resources');
  await expect(page.locator('#condition-amount')).toHaveValue('50000');
  await page.locator('#condition-amount').fill('4294967296');
  await expect(page.locator('#condition-amount')).toHaveAttribute('aria-invalid', 'true');
  await page.keyboard.press('Control+Enter');
  await expect(page.locator('.scenario-card')).toHaveCount(0);
  await page.locator('#condition-amount').fill('50000');
  await page.keyboard.press('Control+Enter');
  await expect(page.locator('.scenario-card')).toContainText('50,000');
  await page.locator('.builder-heading').getByRole('button', { name: 'Close', exact: true }).click();
  await page.locator('.quick-templates').getByRole('button', { name: /Mission message/ }).click();
  await expect(page.locator('#condition-kind')).toHaveValue('always');
  await page.locator('.builder-pane textarea').fill('Hold position');
  await expect(page.locator('.text-meta')).toContainText('13 characters');
  await page.keyboard.press('Control+Enter');
  await expect(page.locator('.scenario-card')).toHaveCount(2);
  const document = await (await page.request.get('/api/v1/documents/' + id, { headers })).json();
  expect(document.program.instructions.some((item: { text: string }) => item.text === 'Hold position')).toBe(true);
});

test('player selection can select and clear every player without submitting the form', async ({ page }) => {
  await start(page);
  await page.locator('.toolbar').getByRole('button', { name: 'Command catalogue', exact: true }).click();
  await page.locator('.catalog-item[data-opcode="7"]').click();
  await page.getByRole('button', { name: 'Select all players', exact: true }).click();
  await expect(page.locator('.player-choices input:checked')).toHaveCount(8);
  await expect(page.locator('.scenario-card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear player selection', exact: true }).click();
  await expect(page.locator('.player-choices input:checked')).toHaveCount(0);
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page.getByLabel('Show field explanations').uncheck();
  await page.keyboard.press('Escape');
  await expect(page.locator('.field-help').first()).not.toBeVisible();
});

test('Save As shortcut preserves its intent and blocks duplicate pending requests', async ({ page }) => {
  await start(page);
  let requests = 0;
  let saveAs = false;
  let release = () => {};
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/documents/*/save', async (route) => {
    requests++; saveAs = route.request().postDataJSON().save_as;
    await pending; await route.fulfill({ status: 422, json: { code: 'dialog.cancelled' } });
  });
  try {
    await page.keyboard.press('Control+Shift+s');
    await expect.poll(() => requests).toBe(1);
    await page.keyboard.press('Control+s'); await page.keyboard.press('Control+Shift+s');
    expect(requests).toBe(1); expect(saveAs).toBe(true);
  } finally { release(); }
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
