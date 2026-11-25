// @vitest-environment node
import { describe, expect, it } from "vitest";
import { api, login } from "../../e2e/api";

describe("stored display names", () => {
  it("fills a missing note, time entry, and request name from the user and property", async () => {
    const cookie = await login("admin", "123456");
    const me = await api("GET", "/api/auth/user", cookie);
    expect(me.status).toBe(200);
    const displayName = `${me.data.firstName ?? ""} ${me.data.lastName ?? ""}`.trim() || me.data.username;

    const property = await api("POST", "/api/properties", cookie, {
      name: `Name snapshot ${Date.now()}`,
      type: "building",
      coordinates: { type: "Point", coordinates: [-80.1, 26.2] },
    });
    expect(property.status).toBe(200);

    const request = await api("POST", "/api/service-requests", cookie, {
      title: `Name snapshot request ${Date.now()}`,
      description: "Confirm the stored requester and property names.",
      urgency: "low",
      propertyId: property.data.id,
    });
    expect(request.status).toBe(200);
    expect(request.data.requesterName).toBe(displayName);
    expect(request.data.propertyName).toBe(property.data.name);

    const task = await api("POST", "/api/tasks", cookie, {
      name: `Name snapshot task ${Date.now()}`,
      description: "Task for a note and a time entry.",
      urgency: "low",
      executorType: "technician",
      status: "in_progress",
      initialDate: new Date().toISOString(),
    });
    expect(task.status === 200 || task.status === 201).toBe(true);

    const note = await api("POST", "/api/task-notes", cookie, {
      taskId: task.data.id,
      content: "Checked the fitting and it holds.",
      noteType: "job_note",
    });
    expect(note.status).toBe(200);
    expect(note.data.userName).toBe(displayName);

    const entry = await api("POST", "/api/time-entries", cookie, {
      taskId: task.data.id,
      startTime: new Date().toISOString(),
      durationMinutes: 15,
    });
    expect(entry.status).toBe(200);
    expect(entry.data.userName).toBe(displayName);
  }, 30000);
});
