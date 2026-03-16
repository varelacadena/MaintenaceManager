import { describe, it, expect } from "vitest";

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";

async function login(username: string, password: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    redirect: "manual",
  });
  const cookies = res.headers.getSetCookie?.() || [];
  const sessionCookie = cookies.find((c: string) => c.startsWith("connect.sid"));
  if (!sessionCookie) throw new Error(`Login failed for ${username}`);
  return sessionCookie.split(";")[0];
}

async function apiGet(path: string, cookie: string) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: { Cookie: cookie } });
  return res.json();
}

async function apiPatch(path: string, body: any, cookie: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

async function apiPost(path: string, body: any, cookie: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

describe("Lockbox per-reservation: API-level E2E tests", () => {
  let techCookie: string;
  let studentCookie: string;
  let staffCookie: string;
  let lockboxId: string;
  let testReservationId: string;

  it("authenticates technician (maintenance/123456)", async () => {
    techCookie = await login("maintenance", "123456");
    expect(techCookie).toBeTruthy();
  });

  it("authenticates student (Sebastian/123456)", async () => {
    studentCookie = await login("Sebastian", "123456");
    expect(studentCookie).toBeTruthy();
  });

  it("authenticates staff (Norberto/norberto123)", async () => {
    staffCookie = await login("Norberto", "norberto123");
    expect(staffCookie).toBeTruthy();
  });

  it("has at least one active lockbox", async () => {
    const lockboxes = await apiGet("/api/lockboxes", techCookie);
    const active = lockboxes.filter((lb: any) => lb.status === "active");
    expect(active.length).toBeGreaterThan(0);
    lockboxId = active[0].id;
  });

  it("finds an approved/active reservation", async () => {
    const reservations = await apiGet("/api/vehicle-reservations", techCookie);
    const approved = reservations.filter(
      (r: any) => r.status === "approved" || r.status === "active"
    );
    expect(approved.length).toBeGreaterThan(0);
    testReservationId = approved[0].id;
  });

  describe("Technician assigns Key Box to reservation", () => {
    it("accepts lockboxId with key_box method", async () => {
      const result = await apiPatch(
        `/api/vehicle-reservations/${testReservationId}`,
        { keyPickupMethod: "key_box", lockboxId },
        techCookie
      );
      expect(result.status).toBe(200);
      expect(result.data.lockboxId).toBe(lockboxId);
      expect(result.data.keyPickupMethod).toBe("key_box");
    });

    it("rejects key_box with null lockboxId", async () => {
      const result = await apiPatch(
        `/api/vehicle-reservations/${testReservationId}`,
        { keyPickupMethod: "key_box", lockboxId: null },
        techCookie
      );
      expect(result.status).toBe(400);
    });

    it("clears lockboxId when switching away from key_box", async () => {
      const result = await apiPatch(
        `/api/vehicle-reservations/${testReservationId}`,
        { keyPickupMethod: "in_person" },
        techCookie
      );
      expect(result.status).toBe(200);
      expect(result.data.lockboxId).toBeNull();
    });

    it("restores key_box with lockboxId", async () => {
      const result = await apiPatch(
        `/api/vehicle-reservations/${testReservationId}`,
        { keyPickupMethod: "key_box", lockboxId },
        techCookie
      );
      expect(result.status).toBe(200);
    });
  });

  describe("Role-based access control", () => {
    it("strips lockbox/handoff fields from student PATCH", async () => {
      const result = await apiPatch(
        `/api/vehicle-reservations/${testReservationId}`,
        { lockboxId: null, keyPickupMethod: "mailbox" },
        studentCookie
      );
      if (result.status === 200) {
        expect(result.data.lockboxId).toBe(lockboxId);
        expect(result.data.keyPickupMethod).toBe("key_box");
      } else {
        expect(result.status).toBe(403);
      }
    });

    it("strips lockbox/handoff fields from staff PATCH", async () => {
      const result = await apiPatch(
        `/api/vehicle-reservations/${testReservationId}`,
        { lockboxId: null, keyPickupMethod: "mailbox" },
        staffCookie
      );
      if (result.status === 200) {
        expect(result.data.lockboxId).toBe(lockboxId);
        expect(result.data.keyPickupMethod).toBe("key_box");
      } else {
        expect(result.status).toBe(403);
      }
    });
  });

  describe("Vehicle no longer has lockboxId", () => {
    it("vehicle response excludes lockboxId", async () => {
      const vehicles = await apiGet("/api/vehicles", techCookie);
      expect(vehicles.length).toBeGreaterThan(0);
      expect(vehicles[0]).not.toHaveProperty("lockboxId");
    });
  });

  describe("Lockbox code assignment from reservation", () => {
    it("assigns code using reservation lockboxId", async () => {
      const reservations = await apiGet("/api/vehicle-reservations", techCookie);
      const withLockbox = reservations.find(
        (r: any) => r.lockboxId && (r.status === "approved" || r.status === "active")
      );
      if (!withLockbox) return;

      const result = await apiPost(
        `/api/lockboxes/${withLockbox.lockboxId}/assign-code`,
        {},
        techCookie
      );
      expect([200, 403]).toContain(result.status);
      if (result.status === 200) {
        expect(result.data).toHaveProperty("code");
        expect(result.data.code).toBeTruthy();
      }
    });
  });

  describe("Checkout flow data integrity", () => {
    it("reservation with key_box has lockboxId for checkout code assignment", async () => {
      const reservation = await apiGet(
        `/api/vehicle-reservations/${testReservationId}`,
        techCookie
      );
      expect(reservation.keyPickupMethod).toBe("key_box");
      expect(reservation.lockboxId).toBe(lockboxId);
    });
  });

  describe("Checkin flow data integrity", () => {
    it("reservation lockboxId resolves to valid lockbox for key return", async () => {
      const reservation = await apiGet(
        `/api/vehicle-reservations/${testReservationId}`,
        techCookie
      );
      if (reservation.lockboxId) {
        const lockbox = await apiGet(
          `/api/lockboxes/${reservation.lockboxId}`,
          techCookie
        );
        expect(lockbox).toHaveProperty("name");
        expect(lockbox).toHaveProperty("location");
        expect(lockbox.status).toBe("active");
      }
    });
  });
});
