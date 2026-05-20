import { test, expect, Page } from "@playwright/test";

async function login(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByTestId("input-username").fill(username);
  await page.getByTestId("input-password").fill(password);
  await page.getByTestId("button-login").click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
}

test.describe("Inventory page – admin", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "admin", "123456");
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");
  });

  test("loads inventory list with search and filters", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Inventory" })).toBeVisible();
    await expect(page.getByTestId("input-search-inventory")).toBeVisible();
    await expect(page.getByTestId("tab-stock-low")).toBeVisible();
    await expect(page.getByTestId("button-create-inventory")).toBeVisible();
  });

  test("low stock tab filters list", async ({ page }) => {
    await page.getByTestId("tab-stock-low").click();
    await expect(page.getByTestId("tab-stock-low")).toHaveAttribute("aria-selected", "true");
    await expect(page).toHaveURL(/lowStock=1/);
  });

  test("can create item and find it via search", async ({ page }) => {
    const unique = `PW Item ${Date.now()}`;
    const barcode = `PW-${Date.now()}`;

    await page.getByTestId("button-create-inventory").click();
    await expect(page.getByTestId("dialog-create-inventory")).toBeVisible();
    await page.getByTestId("input-name").fill(unique);
    await page.getByTestId("input-barcode").fill(barcode);
    await page.getByTestId("button-submit-create").click();
    await expect(page.getByTestId("dialog-create-inventory")).toBeHidden({ timeout: 15000 });

    await page.getByTestId("input-search-inventory").fill(unique);
    await expect(page.getByText(unique)).toBeVisible({ timeout: 15000 });

    await page.getByTestId("button-scan-menu").click();
    await page.getByTestId("button-scan-find").click();
    await expect(page.getByRole("heading", { name: "Find Item" })).toBeVisible();
  });
});
