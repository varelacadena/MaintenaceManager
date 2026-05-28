import { test, expect, type Page } from "@playwright/test";

const MOBILE = { width: 390, height: 844 };

async function login(page: Page) {
  await page.setViewportSize(MOBILE);
  await page.goto("/");
  const username = page.getByTestId("input-username");
  await username.waitFor({ state: "visible", timeout: 15000 });
  await username.fill("admin");
  await page.getByTestId("input-password").fill("123456");
  await page.getByTestId("button-login").click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("button-sidebar-toggle")).toBeVisible({ timeout: 20000 });
}

async function assertNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
    };
  });
  expect(
    overflow.scrollWidth,
    `${label}: document scrollWidth should not exceed viewport`
  ).toBeLessThanOrEqual(MOBILE.width + 2);
}

const adminRoutes: { path: string; ready?: string }[] = [
  { path: "/", ready: "kpi-openTasks" },
  { path: "/work", ready: "text-page-title" },
  { path: "/requests", ready: "input-search" },
  { path: "/new-request" },
  { path: "/calendar" },
  { path: "/analytics", ready: "button-date-filter" },
  { path: "/properties" },
  { path: "/users" },
  { path: "/vendors" },
  { path: "/inventory" },
  { path: "/vehicles" },
  { path: "/settings" },
  { path: "/email-management" },
  { path: "/resources" },
];

test.describe("Mobile QA smoke (390px)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const route of adminRoutes) {
    test(`${route.path} loads without horizontal overflow`, async ({ page }) => {
      await page.setViewportSize(MOBILE);
      await page.goto(route.path);
      await page.waitForLoadState("domcontentloaded");
      if (route.ready) {
        await expect(page.getByTestId(route.ready)).toBeVisible({ timeout: 15000 });
      }
      await assertNoHorizontalOverflow(page, route.path);
    });
  }

  test("sidebar opens on mobile", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto("/work");
    await page.getByTestId("button-sidebar-toggle").click();
    await expect(page.getByRole("link", { name: /work/i }).first()).toBeVisible();
  });
});
