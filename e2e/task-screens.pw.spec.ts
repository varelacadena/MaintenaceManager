import { expect, test, type Page } from "@playwright/test";
import { adminAccount, api, login, technicianAccount } from "./api";

const NOTE = "Replaced the filter and confirmed airflow.";
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

async function clockedStudent(admin: string, prefix: string) {
  const techs = await api("GET", "/api/users/directory?role=technician", admin);
  expect(techs.status).toBe(200);
  const username = `${prefix}_${Date.now()}`;
  const created = await api("POST", "/api/users", admin, {
    username,
    password: "test1234",
    firstName: prefix,
    lastName: "Student",
    role: "student",
  });
  expect(created.status).toBe(200);
  const student = await login(username, "test1234");
  const clockIn = await api("POST", "/api/student/time-clock/clock-in", student, {
    supervisorId: techs.data[0].id,
  });
  expect(clockIn.status).toBe(201);
  const me = await api("GET", "/api/auth/user", student);
  expect(me.status).toBe(200);
  return { username, userId: me.data.id as string };
}

async function createTask(
  cookie: string,
  name: string,
  extra: Record<string, unknown> = {},
) {
  const created = await api("POST", "/api/tasks", cookie, {
    name,
    description: "Screen operation check.",
    urgency: "low",
    status: "in_progress",
    initialDate: new Date().toISOString(),
    requiresPhoto: false,
    ...extra,
  });
  expect(created.status === 200 || created.status === 201).toBe(true);
  return created.data.id as string;
}

async function expectCompleted(cookie: string, taskId: string, note: string) {
  const task = await api("GET", `/api/tasks/${taskId}`, cookie);
  expect(task.status).toBe(200);
  expect(task.data.status).toBe("completed");
  const notes = await api("GET", `/api/task-notes/task/${taskId}`, cookie);
  expect(notes.status).toBe(200);
  expect(notes.data.some((entry: { content: string }) => entry.content === note)).toBe(true);
}

test("admin task screen saves a work note and completes the task", async ({ page }) => {
  const admin = await login("admin", "123456");
  const name = `Admin screen ${Date.now()}`;
  const taskId = await createTask(admin, name, { executorType: "technician" });
  await loginUi(page, "admin", "123456");
  await page.goto(`/tasks/${taskId}`);
  await expect(page.getByTestId("button-admin-mark-complete")).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(name)).toBeVisible();

  await page.getByTestId("panel-field-notes").getByRole("button", { name: "Add note" }).click();
  await page.getByTestId("input-note-content").fill(NOTE);
  await page.getByTestId("button-save-note").click();
  await expect(page.getByText(NOTE)).toBeVisible();
  await page.getByTestId("button-admin-mark-complete").click();
  await expect(page.getByTestId("button-admin-mark-complete")).toHaveCount(0);

  await expectCompleted(admin, taskId, NOTE);
});

test("technician task screen saves a work note and completes the task", async ({ page }) => {
  test.setTimeout(90000);
  const admin = await login(adminAccount.username, adminAccount.password);
  const tech = await login(technicianAccount.username, technicianAccount.password);
  const me = await api("GET", "/api/auth/user", tech);
  expect(me.status).toBe(200);
  const name = `Tech screen ${Date.now()}`;
  const taskId = await createTask(admin, name, {
    executorType: "technician",
    assignedToId: me.data.id,
  });

  await page.route("**/api/objects/upload", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    const objectPath = `uploads/e2e-tech-${Date.now()}.png`;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        uploadURL: `https://mock-storage.local/${objectPath}`,
        objectPath,
      }),
    });
  });

  await loginUi(page, technicianAccount.username, technicianAccount.password);
  await page.goto(`/tasks/${taskId}`);
  await expect(page.getByTestId("text-task-name")).toHaveText(name, { timeout: 20000 });
  await page.getByTestId("textarea-auto-note").fill(NOTE);
  await expect(page.getByText("Saved")).toBeVisible({ timeout: 10000 });

  await page.getByTestId("bottom-button-finish").click();
  await page.getByTestId("button-dialog-photo").locator("xpath=..").locator("input[type=file]").setInputFiles({
    name: "work.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await expect(page.getByTestId("button-mark-complete")).toBeEnabled({ timeout: 15000 });
  await page.getByTestId("button-mark-complete").click();
  await expect(page.getByTestId("tech-bottom-bar").getByText("Completed")).toBeVisible({ timeout: 20000 });

  await expectCompleted(admin, taskId, NOTE);
});

test("student mobile task screen saves a work note and completes the task", async ({ page }) => {
  test.setTimeout(90000);
  const admin = await login("admin", "123456");
  const { username, userId } = await clockedStudent(admin, "mobileui");
  const name = `Mobile screen ${Date.now()}`;
  const taskId = await createTask(admin, name, {
    executorType: "student",
    assignedToId: userId,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await loginUi(page, username, "test1234");
  await page.goto(`/tasks/${taskId}`);
  await expect(page.getByTestId("button-mobile-mark-complete")).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(name)).toBeVisible();

  await page.getByTestId("button-mobile-note").click();
  await page.getByTestId("input-mobile-note").fill(NOTE);
  const noteSaved = page.waitForResponse(async (res) => {
    if (!res.url().includes(`/api/task-notes/task/${taskId}`) || res.request().method() !== "GET" || !res.ok()) {
      return false;
    }
    const body = await res.json();
    return Array.isArray(body) && body.some((entry) => entry.content === NOTE);
  });
  await page.getByTestId("button-submit-note").click();
  await noteSaved;
  await expect(page.getByTestId("sheet-add-note")).toHaveCount(0);
  await page.getByTestId("button-mobile-mark-complete").click();
  await expect(page.getByTestId("mobile-completed-banner")).toBeVisible({ timeout: 15000 });

  await expectCompleted(admin, taskId, NOTE);
});

test("student full task screen saves a work note and completes the task", async ({ page }) => {
  test.setTimeout(90000);
  const admin = await login("admin", "123456");
  const { username, userId } = await clockedStudent(admin, "fullui");
  const name = `Full screen ${Date.now()}`;
  const taskId = await createTask(admin, name, {
    executorType: "student",
    assignedToId: userId,
  });

  await loginUi(page, username, "test1234");
  await page.goto(`/tasks/${taskId}?view=full`);
  await expect(page.getByRole("heading", { name })).toBeVisible({ timeout: 20000 });
  await page.getByTestId("textarea-new-note").fill(NOTE);
  await page.getByTestId("button-submit-note").click();
  await expect(page.getByText(NOTE)).toBeVisible();
  await page.getByTestId("bottom-button-complete").click();
  await expect(page.getByTestId("bottom-button-done")).toBeVisible();

  await expectCompleted(admin, taskId, NOTE);
});
