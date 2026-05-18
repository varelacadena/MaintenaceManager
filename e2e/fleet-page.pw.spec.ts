import { test, expect, Page } from "@playwright/test";

async function login(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByTestId("input-username").fill(username);
  await page.getByTestId("input-password").fill(password);
  await page.getByTestId("button-login").click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
}

test.describe("Fleet page – admin", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "admin", "123456");
    await page.goto("/vehicles");
    await page.waitForLoadState("networkidle");
  });

  test("loads Vehicle Management with fleet and reservations tabs", async ({ page }) => {
    await expect(page.getByTestId("text-page-title")).toHaveText("Vehicle Management");
    await expect(page.getByTestId("tab-fleet")).toBeVisible();
    await expect(page.getByTestId("tab-reservations")).toBeVisible();
    await expect(page.getByTestId("tab-codehub")).toBeVisible();
  });

  test("fleet tab has search and status filter", async ({ page }) => {
    await expect(page.getByTestId("input-search-vehicles")).toBeVisible();
    await expect(page.getByTestId("select-status-filter")).toBeVisible();
  });

  test("can open add vehicle dialog", async ({ page }) => {
    await page.getByTestId("button-add-vehicle").click();
    await expect(page.getByTestId("input-vehicle-id")).toBeVisible();
    await expect(page.getByTestId("button-submit-vehicle")).toBeVisible();
  });

  test("reservations tab loads search and filter", async ({ page }) => {
    await page.getByTestId("tab-reservations").click();
    await expect(page.getByTestId("input-search-reservations")).toBeVisible();
    await expect(page.getByTestId("select-status-filter")).toBeVisible();
  });

  test("deep link opens reservations tab", async ({ page }) => {
    await page.goto("/vehicles?tab=reservations");
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("input-search-reservations")).toBeVisible();
  });
});

test.describe("Fleet page – technician", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "maintenance", "123456");
    await page.goto("/vehicles?tab=reservations");
    await page.waitForLoadState("networkidle");
  });

  test("sees reservations tab without fleet or code hub", async ({ page }) => {
    await expect(page.getByTestId("text-page-title")).toHaveText("Vehicle Management");
    await expect(page.getByTestId("tab-reservations")).toBeVisible();
    await expect(page.getByTestId("tab-fleet")).toHaveCount(0);
    await expect(page.getByTestId("tab-codehub")).toHaveCount(0);
  });

  test("reservations tab has admin workflow controls", async ({ page }) => {
    await expect(page.getByTestId("input-search-reservations")).toBeVisible();
    await expect(page.getByTestId("select-status-filter")).toBeVisible();
  });
});
