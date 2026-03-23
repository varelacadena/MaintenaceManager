import { test, expect, Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByTestId('input-username').fill('admin');
  await page.getByTestId('input-password').fill('123456');
  await page.getByTestId('button-login').click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
}

async function assertNoPointerEventsLock(page: Page) {
  await page.waitForTimeout(2000);
  const pe = await page.evaluate(() => document.body.style.pointerEvents);
  expect(pe).not.toBe('none');
}

async function navigateToDashboard(page: Page) {
  await page.getByTestId('link-dashboard').click();
  await page.waitForTimeout(1000);
  expect(page.url()).not.toContain('/inventory');
  expect(page.url()).not.toContain('/users');
  expect(page.url()).not.toContain('/emergency-contacts');
}

test.describe('Dialog freeze fix', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Inventory Edit dialog cancel does not freeze page', async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForTimeout(1500);

    const menuButton = page.locator('[data-testid^="button-menu-"]').first();
    await menuButton.click();
    await page.getByText('Edit').click();
    await page.waitForTimeout(500);

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    await page.getByTestId('button-cancel-edit').click();
    await assertNoPointerEventsLock(page);

    await page.getByTestId('link-dashboard').click();
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain('/inventory');
  });

  test('Inventory Edit dialog X-close does not freeze page', async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForTimeout(1500);

    const menuButton = page.locator('[data-testid^="button-menu-"]').first();
    await menuButton.click();
    await page.getByText('Edit').click();
    await page.waitForTimeout(500);

    await expect(page.locator('[role="dialog"]')).toBeVisible();

    await page.locator('[role="dialog"] button:has(> .sr-only)').first().click();
    await assertNoPointerEventsLock(page);

    await page.getByTestId('link-dashboard').click();
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain('/inventory');
  });

  test('Inventory Edit dialog save does not freeze page', async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForTimeout(1500);

    const menuButton = page.locator('[data-testid^="button-menu-"]').first();
    await menuButton.click();
    await page.getByText('Edit').click();
    await page.waitForTimeout(500);

    await expect(page.locator('[role="dialog"]')).toBeVisible();

    const saveButton = page.locator('[role="dialog"]').getByRole('button', { name: /save/i });
    await saveButton.click();
    await page.waitForTimeout(3000);

    await assertNoPointerEventsLock(page);

    await page.getByTestId('link-dashboard').click();
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain('/inventory');
  });

  test('Users Create dialog cancel does not freeze page', async ({ page }) => {
    await page.goto('/users');
    await page.waitForTimeout(1500);

    const createBtn = page.locator('button').filter({ hasText: /create|add/i }).first();
    await createBtn.click();
    await page.waitForTimeout(500);

    await expect(page.locator('[role="dialog"]')).toBeVisible();

    const cancelBtn = page.locator('[role="dialog"]').getByRole('button', { name: /cancel/i });
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
    } else {
      await page.locator('[role="dialog"] button:has(> .sr-only)').first().click();
    }

    await assertNoPointerEventsLock(page);

    await page.getByTestId('link-dashboard').click();
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain('/users');
  });

  test('Emergency Contacts Add dialog cancel does not freeze page', async ({ page }) => {
    await page.goto('/emergency-contacts');
    await page.waitForTimeout(1500);

    const addBtn = page.locator('button').filter({ hasText: /add|new|create/i }).first();
    await addBtn.click();
    await page.waitForTimeout(500);

    await expect(page.locator('[role="dialog"]')).toBeVisible();

    const cancelBtn = page.locator('[role="dialog"]').getByRole('button', { name: /cancel/i });
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
    } else {
      await page.locator('[role="dialog"] button:has(> .sr-only)').first().click();
    }

    await assertNoPointerEventsLock(page);

    await page.getByTestId('link-dashboard').click();
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain('/emergency-contacts');
  });
});
