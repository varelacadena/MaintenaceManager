import { test, expect, Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByTestId("input-username").fill("admin");
  await page.getByTestId("input-password").fill("123456");
  await page.getByTestId("button-login").click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
}

test.describe("Work task composer", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("creates tasks on the work list and retires the old page", async ({ page }) => {
    await page.goto("/tasks/new?projectId=demo");
    await page.waitForURL(/\/work\?projectId=demo/);
    await expect(page.getByTestId("text-page-title")).toHaveText("Work");
    await expect(page.getByTestId("work-task-composer")).toBeVisible();
    await expect(page.getByTestId("input-task-name")).toBeVisible();
    await expect(page.getByTestId("textarea-description")).toBeVisible();
    await expect(page.getByTestId("button-submit")).toBeDisabled();
  });

  test("opens who, due, property, and more from the composer", async ({ page }) => {
    await page.goto("/work");
    await page.getByTestId("button-who").click();
    await expect(page.getByRole("button", { name: "Unassigned" })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByTestId("button-due").click();
    await expect(page.getByRole("button", { name: "Custom" })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByTestId("button-property").click();
    await expect(page.getByText("Check every property on this task")).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByTestId("button-more").click();
    await expect(page.getByRole("button", { name: "Subtasks" })).toBeVisible();
    await expect(page.getByText("Life safety round")).toBeVisible();
  });
});

test.describe("Work task composer on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps composer and filter buttons inside the screen", async ({ page }) => {
    await login(page);
    await page.goto("/work");
    const composer = page.getByTestId("work-task-composer");
    await expect(composer).toBeVisible();

    for (const testId of ["button-who", "button-due", "button-priority", "button-property", "button-more", "button-submit", "button-filters"]) {
      const box = await page.getByTestId(testId).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    }

    const who = await page.getByTestId("button-who").boundingBox();
    const due = await page.getByTestId("button-due").boundingBox();
    expect(who && due && Math.abs(who.width - due.width)).toBeLessThan(8);
  });
});
