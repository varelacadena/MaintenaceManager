import { test, expect, Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByTestId('input-username').fill('admin');
  await page.getByTestId('input-password').fill('123456');
  await page.getByTestId('button-login').click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
}

async function navigateToFirstProject(page: Page) {
  await page.goto('/work');
  await page.waitForTimeout(2000);
  const projectsTab = page.getByRole('tab', { name: /projects/i });
  await projectsTab.click();
  await page.waitForTimeout(1500);
  const firstRow = page.locator('[data-testid^="project-row-"]').first();
  await expect(firstRow).toBeVisible({ timeout: 5000 });
  await firstRow.click();
  await page.waitForURL(/\/projects\//, { timeout: 10000 });
  await page.waitForTimeout(1000);
}

test.describe('Project file upload - Desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Upload file via Files tab and verify it appears and can be opened', async ({ page }) => {
    await navigateToFirstProject(page);

    await page.getByTestId('tab-files').click();
    await page.waitForTimeout(500);

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 5000 }),
      page.getByTestId('button-upload-file').click(),
    ]);

    await fileChooser.setFiles({
      name: 'desktop-upload-test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('desktop upload test content'),
    });

    await page.waitForTimeout(3000);

    const fileLink = page.locator('[data-testid^="file-upload-"]').first();
    await expect(fileLink).toBeVisible({ timeout: 5000 });

    const href = await fileLink.getAttribute('href');
    expect(href).toBeTruthy();

    const response = await page.request.get(href!);
    expect(response.status()).toBe(200);
  });

  test('Attach file via comment paperclip and verify it posts', async ({ page }) => {
    await navigateToFirstProject(page);

    await page.getByTestId('tab-activity').click();
    await page.waitForTimeout(500);

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 5000 }),
      page.getByTestId('button-attach-file').click(),
    ]);

    await fileChooser.setFiles({
      name: 'desktop-comment-attach.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('desktop comment attachment content'),
    });

    await page.waitForTimeout(3000);

    const activityFeed = page.locator('[data-testid="activity-feed"]');
    await expect(activityFeed).toContainText('desktop-comment-attach.txt', { timeout: 5000 });
  });
});

test.describe('Project file upload - Mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Upload file via Files tab on mobile and verify it appears and can be opened', async ({ page }) => {
    await navigateToFirstProject(page);

    const filesTab = page.getByTestId('tab-files');
    await filesTab.scrollIntoViewIfNeeded();
    await filesTab.click();
    await page.waitForTimeout(500);

    const uploadBtn = page.getByTestId('button-upload-file');
    await uploadBtn.scrollIntoViewIfNeeded();

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 5000 }),
      uploadBtn.click(),
    ]);

    await fileChooser.setFiles({
      name: 'mobile-upload-test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('mobile upload test content'),
    });

    await page.waitForTimeout(3000);

    const fileLink = page.locator('[data-testid^="file-upload-"]').first();
    await expect(fileLink).toBeVisible({ timeout: 5000 });

    const href = await fileLink.getAttribute('href');
    expect(href).toBeTruthy();

    const response = await page.request.get(href!);
    expect(response.status()).toBe(200);
  });

  test('Attach file via comment paperclip on mobile and verify it posts', async ({ page }) => {
    await navigateToFirstProject(page);

    const activityTab = page.getByTestId('tab-activity');
    await activityTab.scrollIntoViewIfNeeded();
    await activityTab.click();
    await page.waitForTimeout(500);

    const attachBtn = page.getByTestId('button-attach-file');
    await attachBtn.scrollIntoViewIfNeeded();

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 5000 }),
      attachBtn.click(),
    ]);

    await fileChooser.setFiles({
      name: 'mobile-comment-attach.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('mobile comment attachment content'),
    });

    await page.waitForTimeout(3000);

    const activityFeed = page.locator('[data-testid="activity-feed"]');
    await expect(activityFeed).toContainText('mobile-comment-attach.txt', { timeout: 5000 });
  });
});
