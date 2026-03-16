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
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Cookie: cookie },
  });
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

describe("Lockbox assignment is per-reservation (not per-vehicle)", () => {
  let techCookie: string;
  let studentCookie: string;
  let staffCookie: string;
  let lockboxId: string;
  let testReservationId: string;

  it("should authenticate as technician (maintenance/123456)", async () => {
    techCookie = await login("maintenance", "123456");
    expect(techCookie).toBeTruthy();
  });

  it("should authenticate as student (Sebastian/123456)", async () => {
    studentCookie = await login("Sebastian", "123456");
    expect(studentCookie).toBeTruthy();
  });

  it("should authenticate as staff (Norberto/norberto123)", async () => {
    staffCookie = await login("Norberto", "norberto123");
    expect(staffCookie).toBeTruthy();
  });

  it("should have at least one active lockbox", async () => {
    const lockboxes = await apiGet("/api/lockboxes", techCookie);
    const active = lockboxes.filter((lb: any) => lb.status === "active");
    expect(active.length).toBeGreaterThan(0);
    lockboxId = active[0].id;
  });

  it("should find an approved/active reservation to test with", async () => {
    const reservations = await apiGet("/api/vehicle-reservations", techCookie);
    const approved = reservations.filter(
      (r: any) => r.status === "approved" || r.status === "active"
    );
    expect(approved.length).toBeGreaterThan(0);
    testReservationId = approved[0].id;
  });

  describe("Technician sets Key Box pickup method on reservation", () => {
    it("should accept lockboxId when keyPickupMethod is key_box", async () => {
      const result = await apiPatch(
        `/api/vehicle-reservations/${testReservationId}`,
        { keyPickupMethod: "key_box", lockboxId },
        techCookie
      );
      expect(result.status).toBe(200);
      expect(result.data.lockboxId).toBe(lockboxId);
      expect(result.data.keyPickupMethod).toBe("key_box");
    });

    it("should reject key_box when lockboxId is explicitly null", async () => {
      const result = await apiPatch(
        `/api/vehicle-reservations/${testReservationId}`,
        { keyPickupMethod: "key_box", lockboxId: null },
        techCookie
      );
      expect(result.status).toBe(400);
    });

    it("should clear lockboxId when switching away from key_box", async () => {
      const result = await apiPatch(
        `/api/vehicle-reservations/${testReservationId}`,
        { keyPickupMethod: "in_person" },
        techCookie
      );
      expect(result.status).toBe(200);
      expect(result.data.lockboxId).toBeNull();
    });

    it("should restore key_box with lockboxId for subsequent tests", async () => {
      const result = await apiPatch(
        `/api/vehicle-reservations/${testReservationId}`,
        { keyPickupMethod: "key_box", lockboxId },
        techCookie
      );
      expect(result.status).toBe(200);
    });
  });

  describe("Role-based access control for lockbox/handoff fields", () => {
    it("should strip lockboxId and keyPickupMethod from student PATCH", async () => {
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

    it("should strip lockboxId and keyPickupMethod from staff PATCH", async () => {
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

  describe("Vehicle no longer has lockboxId field", () => {
    it("should not include lockboxId in vehicle response", async () => {
      const vehicles = await apiGet("/api/vehicles", techCookie);
      expect(vehicles.length).toBeGreaterThan(0);
      expect(vehicles[0]).not.toHaveProperty("lockboxId");
    });
  });

  describe("Lockbox code assignment uses reservation lockboxId", () => {
    it("should assign code from reservation lockbox for valid user", async () => {
      const reservations = await apiGet("/api/vehicle-reservations", techCookie);
      const withLockbox = reservations.find(
        (r: any) => r.lockboxId && (r.status === "approved" || r.status === "active")
      );
      if (!withLockbox) {
        console.log("No reservation with lockbox found, skipping");
        return;
      }

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

  describe("Reservation endpoint includes lockboxId", () => {
    it("should return lockboxId in single reservation response", async () => {
      const reservation = await apiGet(
        `/api/vehicle-reservations/${testReservationId}`,
        techCookie
      );
      expect(reservation).toHaveProperty("lockboxId");
    });
  });

  describe("Checkout flow reads lockboxId from reservation", () => {
    it("reservation with key_box should have lockboxId for checkout code assignment", async () => {
      const reservation = await apiGet(
        `/api/vehicle-reservations/${testReservationId}`,
        techCookie
      );
      expect(reservation.keyPickupMethod).toBe("key_box");
      expect(reservation.lockboxId).toBe(lockboxId);
    });
  });

  describe("Checkin flow reads lockboxId from reservation", () => {
    it("reservation lockboxId should be accessible for key return step", async () => {
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
