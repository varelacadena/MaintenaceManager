import { test, expect, type Page } from "@playwright/test";

const MOBILE = { width: 390, height: 844 };

async function assertNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
    };
  });
  expect(
    overflow.scrollWidth,
    `${label}: document scrollWidth should not exceed viewport`
  ).toBeLessThanOrEqual(MOBILE.width + 2);
}

test.describe("Public report page", () => {
  test("landing links to report and the phone form fits", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto("/");
    const reportLink = page.getByTestId("link-report-problem");
    await expect(reportLink).toBeVisible({ timeout: 15000 });
    await assertNoHorizontalOverflow(page, "landing");

    await reportLink.click();
    await expect(page).toHaveURL(/\/report/);
    await expect(page.getByRole("heading", { name: "Report a problem" })).toBeVisible();
    await expect(page.getByTestId("input-report-title")).toBeVisible();
    await expect(page.getByTestId("button-report-upload")).toBeVisible();
    await expect(page.getByTestId("button-report-next")).toBeVisible();
    await assertNoHorizontalOverflow(page, "/report step 1");

    await page.getByTestId("input-report-title").fill("Leaking faucet");
    await page.getByTestId("textarea-report-description").fill("Water is pooling under the sink.");
    await page.getByTestId("button-report-urgency-high").click();
    await page.getByTestId("button-report-next").click();
    await expect(page.getByTestId("button-report-upload")).toBeVisible();
    await expect(page.getByTestId("select-report-property")).toHaveCount(0);

    await page.getByTestId("link-report-sign-in").click();
    await expect(page.getByTestId("button-login")).toBeVisible({ timeout: 15000 });
  });

  test("request access also links to report", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto("/request-access");
    await expect(page.getByTestId("link-report-problem")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("link-report-problem").click();
    await expect(page).toHaveURL(/\/report/);
    await expect(page.getByTestId("input-report-title")).toBeVisible();
  });
});
