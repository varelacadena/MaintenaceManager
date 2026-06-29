import { test, expect, Page } from "@playwright/test";

async function login(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByTestId("input-username").fill(username);
  await page.getByTestId("input-password").fill(password);
  await page.getByTestId("button-login").click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
}

test.describe("Work page – admin", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "admin", "123456");
    await page.goto("/work");
    await page.waitForLoadState("networkidle");
  });

  test("loads Work hub with tasks tab and search", async ({ page }) => {
    await expect(page.getByTestId("text-page-title")).toHaveText("Work");
    await expect(page.getByTestId("work-tabs")).toBeVisible();
    await expect(page.getByTestId("tab-tasks")).toBeVisible();
    await expect(page.getByTestId("input-search-work")).toBeVisible();
  });

  test("can switch to Projects tab", async ({ page }) => {
    await page.getByTestId("tab-projects").click();
    await expect(page.getByTestId("input-search-projects")).toBeVisible();
  });

  test("status group headers are keyboard accessible", async ({ page }) => {
    const toggle = page.getByTestId("toggle-group-in_progress");
    if (!(await toggle.isVisible())) {
      test.skip();
    }
    await toggle.focus();
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute("aria-expanded");
  });

  test("task query param navigates to task detail page when task exists", async ({ page }) => {
    const firstRow = page.locator("[data-testid^='row-task-']").first();
    if (!(await firstRow.isVisible())) {
      test.skip();
    }
    const testId = await firstRow.getAttribute("data-testid");
    const taskId = testId?.replace("row-task-", "");
    if (!taskId) test.skip();

    await page.goto(`/work?task=${taskId}`);
    await page.waitForURL(`**/tasks/${taskId}`, { timeout: 15000 });
    await expect(page.getByTestId("admin-task-detail-page")).toBeVisible();
    await expect(page.getByTestId("task-detail-panel")).toBeVisible();
    await expect(page.getByTestId("text-panel-task-title")).toBeVisible();
  });

  test("search with no matches shows empty search state", async ({ page }) => {
    await page.getByTestId("input-search-work").fill("zzz-no-match-xyz-12345");
    const empty = page.getByTestId("work-tasks-empty-search");
    const hasEmpty = await empty.isVisible().catch(() => false);
    const hasGroups = await page.getByTestId("group-not_started").isVisible().catch(() => false);
    expect(hasEmpty || !hasGroups).toBeTruthy();
  });
});

test.describe("Work page – student", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "student", "123456");
    await page.goto("/work");
    await page.waitForLoadState("networkidle");
  });

  test("shows student task view with date filters", async ({ page }) => {
    await expect(page.getByTestId("text-page-title")).toHaveText("Your Tasks");
    await expect(page.getByTestId("date-filter-bar")).toBeVisible();
    await expect(page.getByTestId("button-filter-today")).toBeVisible();
  });
});

test.describe("Work page – staff blocked", () => {
  test("staff sees unavailable message", async ({ page }) => {
    await login(page, "staff", "123456");
    await page.goto("/work");
    await expect(page.getByTestId("staff-work-unavailable")).toBeVisible();
    await expect(page.getByTestId("button-staff-go-requests")).toBeVisible();
  });
});
