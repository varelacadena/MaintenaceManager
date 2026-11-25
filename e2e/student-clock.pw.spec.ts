import { expect, test } from "@playwright/test";
import { api, login } from "./api";

test("clock-out screen refuses a short recap and accepts a full one", async ({ page }) => {
  const admin = await login("admin", "123456");
  const techs = await api("GET", "/api/users/directory?role=technician", admin);
  expect(techs.status).toBe(200);
  const supervisorId = techs.data[0].id;
  const username = `clockui_${Date.now()}`;
  const created = await api("POST", "/api/users", admin, {
    username,
    password: "test1234",
    firstName: "Clock",
    lastName: "Out",
    role: "student",
  });
  expect(created.status).toBe(200);

  const student = await login(username, "test1234");
  const clockIn = await api("POST", "/api/student/time-clock/clock-in", student, { supervisorId });
  expect(clockIn.status).toBe(201);

  await page.goto("/login");
  await page.getByTestId("input-username").fill(username);
  await page.getByTestId("input-password").fill("test1234");
  await page.getByTestId("button-login").click();
  await page.waitForURL((url) => !url.pathname.includes("/login"));
  await page.goto("/clock-out");
  await expect(page.getByTestId("student-clock-out-page")).toBeVisible();

  await page.getByTestId("textarea-what-i-did").fill("short");
  await page.getByTestId("textarea-what-i-learned").fill("short");
  await expect(page.getByTestId("button-clock-out")).toBeDisabled();
  await expect(page.getByTestId("student-clock-out-page")).toBeVisible();

  await page.getByTestId("textarea-what-i-did").fill("Replaced a gasket and checked for leaks.");
  await page.getByTestId("textarea-what-i-learned").fill("I learned how to seat the gasket evenly.");
  await page.getByTestId("button-clock-out").click();
  await page.waitForURL((url) => !url.pathname.includes("/clock-out"));

  const clock = await api("GET", "/api/student/time-clock", student);
  expect(clock.status).toBe(200);
  expect(clock.data.openEntry).toBeNull();
});
