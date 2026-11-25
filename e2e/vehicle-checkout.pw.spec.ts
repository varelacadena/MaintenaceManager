import { expect, test, type Page } from "@playwright/test";
import { api, login } from "./api";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function loginUi(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByTestId("input-username").fill(username);
  await page.getByTestId("input-password").fill(password);
  await page.getByTestId("button-login").click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
}

async function mockPhotoUpload(page: Page) {
  let n = 0;
  await page.route("**/api/objects/upload", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    n += 1;
    const objectPath = `uploads/e2e-${Date.now()}-${n}.png`;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        uploadURL: `https://mock-storage.local/${objectPath}`,
        objectPath,
      }),
    });
  });
}

async function attachPhoto(page: Page) {
  const input = page.locator("input[type=file]").first();
  await input.setInputFiles({ name: "dash.png", mimeType: "image/png", buffer: PNG });
}

async function createApprovedReservation(cookie: string, label: string) {
  const vehicle = await api("POST", "/api/vehicles", cookie, {
    make: "Ford",
    model: "Transit",
    year: 2020,
    vehicleId: `${label}-${Date.now()}`,
    category: "van",
    fuelType: "gas",
    currentMileage: 1000,
    status: "available",
  });
  expect(vehicle.status).toBe(200);
  const start = new Date();
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  const reservation = await api("POST", "/api/vehicle-reservations", cookie, {
    vehicleId: vehicle.data.id,
    purpose: `E2E ${label}`,
    passengerCount: 1,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    status: "approved",
    keyPickupMethod: "in_person",
  });
  expect(reservation.status).toBe(200);
  return { vehicleId: vehicle.data.id as string, reservationId: reservation.data.id as string };
}

test("check-out screen records mileage, fuel, and a dash photo", async ({ page }) => {
  test.setTimeout(90000);
  const admin = await login("admin", "123456");
  const { reservationId } = await createApprovedReservation(admin, "checkout");
  await mockPhotoUpload(page);
  await loginUi(page, "admin", "123456");
  await page.goto(`/vehicle-checkout/${reservationId}`);
  await expect(page.getByTestId("text-page-title")).toHaveText("Vehicle Check-Out");

  await page.getByTestId("button-accept-advisory").click();
  await page.getByTestId("button-have-keys-continue").click();
  await page.getByTestId("checkbox-safety").click();
  await page.getByTestId("checkbox-fuel-responsibility").click();
  await page.getByTestId("checkbox-cleanliness-responsibility").click();
  await page.getByTestId("button-responsibility-continue").click();

  await expect(page.getByTestId("input-start-mileage")).toBeVisible();
  await page.getByTestId("input-start-mileage").fill("1001");
  await page.getByTestId("button-mileage-next").click();
  await page.getByTestId("fuel-option-full").click();
  await page.getByTestId("button-fuel-next").click();
  await page.getByTestId("condition-clean").click();
  await page.getByTestId("button-condition-next").click();
  await page.getByTestId("damage-none").click();
  await page.getByTestId("button-damage-next").click();

  await attachPhoto(page);
  await expect(page.getByTestId("button-submit-checkout")).toBeEnabled();
  await page.getByTestId("button-submit-checkout").click();
  await expect(page.getByText("You're All Set!")).toBeVisible();

  const logs = await api("GET", "/api/vehicle-checkout-logs", admin);
  expect(logs.status).toBe(200);
  const log = logs.data.find((entry: { reservationId: string }) => entry.reservationId === reservationId);
  expect(log.startMileage).toBe(1001);
  expect(log.fuelLevel).toBe("full");
});

test("check-in screen records the return and the dash photo", async ({ page }) => {
  test.setTimeout(90000);
  const admin = await login("admin", "123456");
  const { vehicleId, reservationId } = await createApprovedReservation(admin, "checkin");
  const checkout = await api("POST", "/api/vehicle-checkout-logs", admin, {
    vehicleId,
    reservationId,
    startMileage: 1000,
    fuelLevel: "1/2",
    cleanlinessConfirmed: true,
    damageNotes: "",
  });
  expect(checkout.status).toBe(200);

  await mockPhotoUpload(page);
  await loginUi(page, "admin", "123456");
  await page.goto(`/vehicle-checkin/${checkout.data.id}`);
  await expect(page.getByTestId("text-page-title")).toHaveText("Vehicle Check-In");
  await page.getByTestId("button-start-inspection").click();
  await page.getByTestId("input-end-mileage").fill("1008");
  await page.getByTestId("button-mileage-next").click();
  await page.getByTestId("fuel-option-full").click();
  await page.getByTestId("button-fuel-next").click();
  await page.getByTestId("cleanliness-clean").click();
  await page.getByTestId("button-cleanliness-next").click();
  await page.getByTestId("issues-none").click();
  await page.getByTestId("button-issues-next").click();

  await attachPhoto(page);
  await expect(page.getByText("dash.png")).toBeVisible();
  await attachPhoto(page);
  await expect(page.getByTestId("button-photos-next")).toBeEnabled();
  await page.getByTestId("button-photos-next").click();
  await page.getByTestId("button-submit-checkin").click();
  await expect(page.getByText("Trip Stats")).toBeVisible();

  const checkIns = await api("GET", `/api/vehicle-checkin-logs?vehicleId=${vehicleId}`, admin);
  expect(checkIns.status).toBe(200);
  const log = checkIns.data.find((entry: { checkOutLogId: string }) => entry.checkOutLogId === checkout.data.id);
  expect(log.endMileage).toBe(1008);
  expect(log.fuelLevel).toBe("full");
});
