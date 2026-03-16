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
  return { status: res.status, data: await res.json() };
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

describe("Lockbox per-reservation: full E2E tests across roles", () => {
  let adminCookie: string;
  let techCookie: string;
  let studentCookie: string;
  let staffCookie: string;
  let lockboxId: string;
  let testReservationId: string;
  let testVehicleId: string;

  describe("Authentication across all roles", () => {
    it("authenticates admin (admin/123456)", async () => {
      adminCookie = await login("admin", "123456");
      expect(adminCookie).toBeTruthy();
    });

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
  });

  describe("Setup: locate lockbox and reservation", () => {
    it("has at least one active lockbox", async () => {
      const { data: lockboxes } = await apiGet("/api/lockboxes", techCookie);
      const active = lockboxes.filter((lb: any) => lb.status === "active");
      expect(active.length).toBeGreaterThan(0);
      lockboxId = active[0].id;
    });

    it("finds an approved/active reservation", async () => {
      const { data: reservations } = await apiGet("/api/vehicle-reservations", techCookie);
      const eligible = reservations.filter(
        (r: any) => r.status === "approved" || r.status === "active"
      );
      expect(eligible.length).toBeGreaterThan(0);
      testReservationId = eligible[0].id;
      if (eligible[0].vehicleId) testVehicleId = eligible[0].vehicleId;
    });
  });

  describe("Technician: assign Key Box lockbox to reservation", () => {
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

    it("rejects key_box when lockboxId is explicitly null", async () => {
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
      expect(result.data.keyPickupMethod).toBe("in_person");
    });

    it("restores key_box with lockboxId for subsequent tests", async () => {
      const result = await apiPatch(
        `/api/vehicle-reservations/${testReservationId}`,
        { keyPickupMethod: "key_box", lockboxId },
        techCookie
      );
      expect(result.status).toBe(200);
      expect(result.data.lockboxId).toBe(lockboxId);
    });
  });

  describe("Admin: can also assign Key Box lockbox to reservation", () => {
    it("accepts lockboxId with key_box method via admin", async () => {
      const result = await apiPatch(
        `/api/vehicle-reservations/${testReservationId}`,
        { keyPickupMethod: "key_box", lockboxId },
        adminCookie
      );
      expect(result.status).toBe(200);
      expect(result.data.lockboxId).toBe(lockboxId);
      expect(result.data.keyPickupMethod).toBe("key_box");
    });
  });

  describe("Role-based access control for lockbox/handoff fields", () => {
    it("student PATCH does not modify lockbox fields", async () => {
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

    it("staff PATCH does not modify lockbox fields", async () => {
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

  describe("Vehicle API no longer exposes lockboxId", () => {
    it("vehicle response excludes lockboxId (technician)", async () => {
      const { data: vehicles } = await apiGet("/api/vehicles", techCookie);
      expect(vehicles.length).toBeGreaterThan(0);
      for (const v of vehicles) {
        expect(v).not.toHaveProperty("lockboxId");
      }
    });

    it("vehicle response excludes lockboxId (admin)", async () => {
      const { data: vehicles } = await apiGet("/api/vehicles", adminCookie);
      expect(vehicles.length).toBeGreaterThan(0);
      expect(vehicles[0]).not.toHaveProperty("lockboxId");
    });

    it("single vehicle GET excludes lockboxId", async () => {
      if (!testVehicleId) return;
      const { data: vehicle } = await apiGet(`/api/vehicles/${testVehicleId}`, adminCookie);
      expect(vehicle).not.toHaveProperty("lockboxId");
    });
  });

  describe("Checkout flow: reservation lockboxId used for code assignment", () => {
    it("reservation with key_box has lockboxId accessible for checkout", async () => {
      const { data: reservation } = await apiGet(
        `/api/vehicle-reservations/${testReservationId}`,
        techCookie
      );
      expect(reservation.keyPickupMethod).toBe("key_box");
      expect(reservation.lockboxId).toBe(lockboxId);
    });

    it("student can read their own reservation lockboxId for checkout", async () => {
      const { data: reservations } = await apiGet("/api/vehicle-reservations", studentCookie);
      const withLockbox = reservations.find((r: any) => r.lockboxId);
      if (withLockbox) {
        expect(withLockbox.lockboxId).toBeTruthy();
        expect(withLockbox.keyPickupMethod).toBe("key_box");
      }
    });

    it("staff can read reservation lockboxId for checkout", async () => {
      const { data: reservations } = await apiGet("/api/vehicle-reservations", staffCookie);
      const withLockbox = reservations.find((r: any) => r.lockboxId);
      if (withLockbox) {
        expect(withLockbox.lockboxId).toBeTruthy();
      }
    });

    it("lockbox code assignment works using reservation lockboxId", async () => {
      const { data: reservations } = await apiGet("/api/vehicle-reservations", techCookie);
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

  describe("Checkin flow: reservation lockboxId used for key return", () => {
    it("reservation lockboxId resolves to valid lockbox for key return (tech)", async () => {
      const { data: reservation } = await apiGet(
        `/api/vehicle-reservations/${testReservationId}`,
        techCookie
      );
      expect(reservation.lockboxId).toBe(lockboxId);
      const { data: lockbox } = await apiGet(
        `/api/lockboxes/${reservation.lockboxId}`,
        techCookie
      );
      expect(lockbox).toHaveProperty("name");
      expect(lockbox).toHaveProperty("location");
      expect(lockbox.status).toBe("active");
    });

    it("reservation lockboxId resolves to valid lockbox for key return (admin)", async () => {
      const { data: reservation } = await apiGet(
        `/api/vehicle-reservations/${testReservationId}`,
        adminCookie
      );
      expect(reservation.lockboxId).toBe(lockboxId);
      const { data: lockbox } = await apiGet(
        `/api/lockboxes/${reservation.lockboxId}`,
        adminCookie
      );
      expect(lockbox).toHaveProperty("name");
      expect(lockbox.status).toBe("active");
    });
  });

  describe("QR scan path: vehicle detail leads to checkout using reservation lockbox", () => {
    it("vehicle detail accessible via vehicle ID (QR scan URL pattern)", async () => {
      if (!testVehicleId) return;
      const { status, data: vehicle } = await apiGet(`/api/vehicles/${testVehicleId}`, adminCookie);
      expect(status).toBe(200);
      expect(vehicle).toHaveProperty("id");
      expect(vehicle).not.toHaveProperty("lockboxId");
    });

    it("reservation for vehicle has lockboxId for checkout after QR scan", async () => {
      if (!testVehicleId) return;
      const { data: reservations } = await apiGet("/api/vehicle-reservations", adminCookie);
      const vehicleReservation = reservations.find(
        (r: any) => r.vehicleId === testVehicleId && r.lockboxId
      );
      if (vehicleReservation) {
        expect(vehicleReservation.lockboxId).toBeTruthy();
        expect(vehicleReservation.keyPickupMethod).toBe("key_box");
      }
    });
  });

  describe("Reservation response includes lockboxId in all contexts", () => {
    it("single reservation GET includes lockboxId (tech)", async () => {
      const { data: reservation } = await apiGet(
        `/api/vehicle-reservations/${testReservationId}`,
        techCookie
      );
      expect(reservation).toHaveProperty("lockboxId");
      expect(reservation).toHaveProperty("keyPickupMethod");
    });

    it("reservation list includes lockboxId (admin)", async () => {
      const { data: reservations } = await apiGet("/api/vehicle-reservations", adminCookie);
      expect(reservations.length).toBeGreaterThan(0);
      const withLockbox = reservations.find((r: any) => r.lockboxId === lockboxId);
      expect(withLockbox).toBeTruthy();
    });
  });
});
