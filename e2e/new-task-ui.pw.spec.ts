import { test, expect, Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByTestId('input-username').fill('admin');
  await page.getByTestId('input-password').fill('123456');
  await page.getByTestId('button-login').click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
}

test.describe('New Task – Two-Column Layout', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/tasks/new');
    await page.waitForTimeout(1000);
  });

  test('page title and layout renders correctly', async ({ page }) => {
    await expect(page.getByTestId('text-page-title')).toBeVisible();
    await expect(page.getByTestId('text-page-title')).toHaveText('New Task');
    await expect(page.getByTestId('input-task-name')).toBeVisible();
    await expect(page.getByTestId('textarea-description')).toBeVisible();
    await expect(page.getByTestId('section-details')).toBeVisible();
    await expect(page.getByTestId('section-location')).toBeVisible();
    await expect(page.getByTestId('section-schedule')).toBeVisible();
    await expect(page.getByTestId('section-subtasks')).toBeVisible();
    await expect(page.getByTestId('section-checklists')).toBeVisible();
  });

  test('priority toggle buttons switch correctly', async ({ page }) => {
    const urgencyGroup = page.getByTestId('select-urgency');
    await expect(urgencyGroup).toBeVisible();

    const highBtn = page.getByTestId('priority-high');
    const medBtn = page.getByTestId('priority-medium');
    const lowBtn = page.getByTestId('priority-low');

    await expect(highBtn).toBeVisible();
    await expect(medBtn).toBeVisible();
    await expect(lowBtn).toBeVisible();

    await highBtn.click();
    await expect(highBtn).toHaveClass(/bg-red-500/);
    await expect(medBtn).not.toHaveClass(/bg-amber-500/);

    await lowBtn.click();
    await expect(lowBtn).toHaveClass(/bg-emerald-500/);
    await expect(highBtn).not.toHaveClass(/bg-red-500/);

    await medBtn.click();
    await expect(medBtn).toHaveClass(/bg-amber-500/);
    await expect(lowBtn).not.toHaveClass(/bg-emerald-500/);
  });

  test('assignment segmented control shows correct dropdowns', async ({ page }) => {
    const assignmentControl = page.getByTestId('select-assignment-option');
    await expect(assignmentControl).toBeVisible();

    await page.getByTestId('assignment-tab-student').click();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('select-assigned-student')).toBeVisible();

    await page.getByTestId('assignment-tab-vendor').click();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('select-assigned-vendor')).toBeVisible();
    await expect(page.getByTestId('select-assigned-student')).not.toBeVisible();

    await page.getByTestId('assignment-tab-technician').click();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('select-assigned-user')).toBeVisible();
    await expect(page.getByTestId('select-assigned-vendor')).not.toBeVisible();
  });

  test('student assignment shows instructions and photo checkbox', async ({ page }) => {
    await page.getByTestId('assignment-tab-student').click();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('input-instructions')).toBeVisible();
    await expect(page.getByTestId('checkbox-requires-photo')).toBeVisible();
  });

  test('contact section has Staff and Other buttons', async ({ page }) => {
    await expect(page.getByTestId('button-contact-staff')).toBeVisible();
    await expect(page.getByTestId('button-contact-other')).toBeVisible();

    await page.getByTestId('button-contact-staff').click();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('select-contact-staff')).toBeVisible();

    await page.getByTestId('button-contact-other').click();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('input-contact-name')).toBeVisible();
    await expect(page.getByTestId('input-contact-email')).toBeVisible();
    await expect(page.getByTestId('input-contact-phone')).toBeVisible();
  });

  test('add and remove sub-tasks', async ({ page }) => {
    await page.getByTestId('button-add-subtask').click();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('input-subtask-name-0')).toBeVisible();
    await page.getByTestId('input-subtask-name-0').fill('Test subtask');

    await page.getByTestId('button-add-subtask').click();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('input-subtask-name-1')).toBeVisible();

    await page.getByTestId('button-remove-subtask-1').click();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('input-subtask-name-1')).not.toBeVisible();
    await expect(page.getByTestId('input-subtask-name-0')).toBeVisible();
  });

  test('checklist dialog opens and accepts items', async ({ page }) => {
    await page.getByTestId('button-add-checklist').click();
    await page.waitForTimeout(500);

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    await page.getByTestId('input-checklist-name').fill('Safety Checks');
    await page.getByTestId('input-new-checklist-item').fill('Check extinguisher');
    await page.getByTestId('button-add-checklist-item').click();
    await page.waitForTimeout(200);
    await expect(page.getByTestId('text-checklist-item-0')).toBeVisible();

    await page.getByTestId('button-save-checklist').click();
    await page.waitForTimeout(300);
    await expect(dialog).not.toBeVisible();
  });

  test('task type selector works', async ({ page }) => {
    const taskTypeSelect = page.getByTestId('select-task-type');
    await expect(taskTypeSelect).toBeVisible();
    await taskTypeSelect.click();
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: 'Recurring' }).click();
    await page.waitForTimeout(300);
    await expect(taskTypeSelect).toContainText('Recurring');
  });

  test('options checkbox works', async ({ page }) => {
    const estimateCheckbox = page.getByTestId('checkbox-requires-estimate');
    await expect(estimateCheckbox).toBeVisible();
    await estimateCheckbox.click();
    await expect(estimateCheckbox).toBeChecked();
  });

  test('sticky footer has Cancel and Create Task buttons', async ({ page }) => {
    await expect(page.getByTestId('button-cancel')).toBeVisible();
    await expect(page.getByTestId('button-submit')).toBeVisible();
    await expect(page.getByTestId('button-submit')).toContainText('Create Task');
  });
});

test.describe('New Task – Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/tasks/new');
    await page.waitForTimeout(1000);
  });

  test('mobile layout stacks sections vertically', async ({ page }) => {
    await expect(page.getByTestId('text-page-title')).toBeVisible();
    await expect(page.getByTestId('input-task-name')).toBeVisible();

    await expect(page.getByTestId('section-details')).toBeVisible();
    await expect(page.getByTestId('section-subtasks')).toBeVisible();
    await expect(page.getByTestId('select-urgency')).toBeVisible();
    await expect(page.getByTestId('select-assignment-option')).toBeVisible();

    const detailsBox = await page.getByTestId('section-details').boundingBox();
    const urgencyBox = await page.getByTestId('select-urgency').boundingBox();

    if (detailsBox && urgencyBox) {
      expect(urgencyBox.y).toBeGreaterThan(detailsBox.y + detailsBox.height - 50);
    }
  });

  test('mobile priority toggles work', async ({ page }) => {
    const highBtn = page.getByTestId('priority-high');
    await highBtn.scrollIntoViewIfNeeded();
    await highBtn.click();
    await expect(highBtn).toHaveClass(/bg-red-500/);
  });

  test('mobile assignment tabs work', async ({ page }) => {
    const studentTab = page.getByTestId('assignment-tab-student');
    await studentTab.scrollIntoViewIfNeeded();
    await studentTab.click();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('select-assigned-student')).toBeVisible();
  });

  test('mobile footer buttons visible', async ({ page }) => {
    await expect(page.getByTestId('button-cancel')).toBeVisible();
    await expect(page.getByTestId('button-submit')).toBeVisible();
  });
});
