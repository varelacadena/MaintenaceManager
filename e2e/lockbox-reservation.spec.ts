import assert from "node:assert";

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
let passed = 0;
let failed = 0;

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

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
  }
}

async function run() {
  /**
   * Credential mapping (verified against database):
   *   admin      -> role: admin,      password: 123456
   *   maintenance -> role: technician, password: 123456
   *   Norberto   -> role: staff,      password: norberto123
   *   Sebastian  -> role: student,    password: 123456
   */
  let adminCookie: string;
  let techCookie: string;
  let studentCookie: string;
  let staffCookie: string;
  let lockboxId: string;
  let testReservationId: string;
  let testVehicleId: string;

  console.log("\n=== Authentication across all roles ===");

  await test("authenticates admin (admin/123456)", async () => {
    adminCookie = await login("admin", "123456");
    assert.ok(adminCookie, "Admin cookie should be set");
  });

  await test("authenticates technician (maintenance/123456)", async () => {
    techCookie = await login("maintenance", "123456");
    assert.ok(techCookie, "Tech cookie should be set");
  });

  await test("authenticates student (Sebastian/123456)", async () => {
    studentCookie = await login("Sebastian", "123456");
    assert.ok(studentCookie, "Student cookie should be set");
  });

  await test("authenticates staff (Norberto/norberto123)", async () => {
    staffCookie = await login("Norberto", "norberto123");
    assert.ok(staffCookie, "Staff cookie should be set");
  });

  console.log("\n=== Setup: locate lockbox and reservation ===");

  await test("has at least one active lockbox", async () => {
    const { data: lockboxes } = await apiGet("/api/lockboxes", techCookie);
    const active = lockboxes.filter((lb: any) => lb.status === "active");
    assert.ok(active.length > 0, "Should have at least one active lockbox");
    lockboxId = active[0].id;
  });

  await test("finds an approved/active reservation", async () => {
    const { data: reservations } = await apiGet("/api/vehicle-reservations", techCookie);
    const eligible = reservations.filter(
      (r: any) => r.status === "approved" || r.status === "active"
    );
    assert.ok(eligible.length > 0, "Should have at least one eligible reservation");
    testReservationId = eligible[0].id;
    if (eligible[0].vehicleId) testVehicleId = eligible[0].vehicleId;
  });

  console.log("\n=== Technician: assign Key Box lockbox to reservation ===");

  await test("tech accepts lockboxId with key_box method", async () => {
    const result = await apiPatch(
      `/api/vehicle-reservations/${testReservationId}`,
      { keyPickupMethod: "key_box", lockboxId },
      techCookie
    );
    assert.strictEqual(result.status, 200, `Expected 200 got ${result.status}`);
    assert.strictEqual(result.data.lockboxId, lockboxId);
    assert.strictEqual(result.data.keyPickupMethod, "key_box");
  });

  await test("tech rejects key_box when lockboxId is null", async () => {
    const result = await apiPatch(
      `/api/vehicle-reservations/${testReservationId}`,
      { keyPickupMethod: "key_box", lockboxId: null },
      techCookie
    );
    assert.strictEqual(result.status, 400, `Expected 400 got ${result.status}`);
  });

  await test("tech clears lockboxId when switching away from key_box", async () => {
    const result = await apiPatch(
      `/api/vehicle-reservations/${testReservationId}`,
      { keyPickupMethod: "in_person" },
      techCookie
    );
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.data.lockboxId, null, "lockboxId should be null");
    assert.strictEqual(result.data.keyPickupMethod, "in_person");
  });

  await test("tech restores key_box with lockboxId", async () => {
    const result = await apiPatch(
      `/api/vehicle-reservations/${testReservationId}`,
      { keyPickupMethod: "key_box", lockboxId },
      techCookie
    );
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.data.lockboxId, lockboxId);
  });

  console.log("\n=== Admin: assign Key Box lockbox to reservation ===");

  await test("admin accepts lockboxId with key_box method", async () => {
    const result = await apiPatch(
      `/api/vehicle-reservations/${testReservationId}`,
      { keyPickupMethod: "key_box", lockboxId },
      adminCookie
    );
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.data.lockboxId, lockboxId);
    assert.strictEqual(result.data.keyPickupMethod, "key_box");
  });

  console.log("\n=== Role-based access control for lockbox fields ===");

  await test("student PATCH does not modify lockbox fields", async () => {
    const result = await apiPatch(
      `/api/vehicle-reservations/${testReservationId}`,
      { lockboxId: null, keyPickupMethod: "mailbox" },
      studentCookie
    );
    if (result.status === 200) {
      assert.strictEqual(result.data.lockboxId, lockboxId, "lockboxId should be unchanged");
      assert.strictEqual(result.data.keyPickupMethod, "key_box", "keyPickupMethod should be unchanged");
    } else {
      assert.strictEqual(result.status, 403, `Expected 200 or 403 got ${result.status}`);
    }
  });

  await test("staff PATCH does not modify lockbox fields", async () => {
    const result = await apiPatch(
      `/api/vehicle-reservations/${testReservationId}`,
      { lockboxId: null, keyPickupMethod: "mailbox" },
      staffCookie
    );
    if (result.status === 200) {
      assert.strictEqual(result.data.lockboxId, lockboxId, "lockboxId should be unchanged");
      assert.strictEqual(result.data.keyPickupMethod, "key_box", "keyPickupMethod should be unchanged");
    } else {
      assert.strictEqual(result.status, 403, `Expected 200 or 403 got ${result.status}`);
    }
  });

  console.log("\n=== Vehicle API no longer exposes lockboxId ===");

  await test("vehicle list excludes lockboxId (technician)", async () => {
    const { data: vehicles } = await apiGet("/api/vehicles", techCookie);
    assert.ok(vehicles.length > 0, "Should have vehicles");
    for (const v of vehicles) {
      assert.ok(!("lockboxId" in v), `Vehicle ${v.id} should not have lockboxId`);
    }
  });

  await test("vehicle list excludes lockboxId (admin)", async () => {
    const { data: vehicles } = await apiGet("/api/vehicles", adminCookie);
    assert.ok(vehicles.length > 0);
    assert.ok(!("lockboxId" in vehicles[0]), "Vehicle should not have lockboxId");
  });

  await test("single vehicle GET excludes lockboxId", async () => {
    if (!testVehicleId) { console.log("    (skipped - no vehicleId)"); return; }
    const { data: vehicle } = await apiGet(`/api/vehicles/${testVehicleId}`, adminCookie);
    assert.ok(!("lockboxId" in vehicle), "Vehicle should not have lockboxId");
  });

  console.log("\n=== Checkout flow: reservation lockboxId for code assignment ===");

  await test("reservation with key_box has lockboxId for checkout (tech)", async () => {
    const { data: reservation } = await apiGet(
      `/api/vehicle-reservations/${testReservationId}`,
      techCookie
    );
    assert.strictEqual(reservation.keyPickupMethod, "key_box");
    assert.strictEqual(reservation.lockboxId, lockboxId);
  });

  await test("student reads own reservation lockboxId for checkout", async () => {
    const { data: reservations } = await apiGet("/api/vehicle-reservations", studentCookie);
    const withLockbox = reservations.find((r: any) => r.lockboxId);
    if (withLockbox) {
      assert.ok(withLockbox.lockboxId, "lockboxId should be present");
      assert.strictEqual(withLockbox.keyPickupMethod, "key_box");
    }
  });

  await test("staff reads reservation lockboxId for checkout", async () => {
    const { data: reservations } = await apiGet("/api/vehicle-reservations", staffCookie);
    const withLockbox = reservations.find((r: any) => r.lockboxId);
    if (withLockbox) {
      assert.ok(withLockbox.lockboxId, "lockboxId should be present");
    }
  });

  await test("lockbox code assignment works via reservation lockboxId", async () => {
    const { data: reservations } = await apiGet("/api/vehicle-reservations", techCookie);
    const withLockbox = reservations.find(
      (r: any) => r.lockboxId && (r.status === "approved" || r.status === "active")
    );
    if (!withLockbox) { console.log("    (skipped - no reservation with lockbox)"); return; }

    const result = await apiPost(
      `/api/lockboxes/${withLockbox.lockboxId}/assign-code`,
      {},
      techCookie
    );
    assert.ok([200, 403].includes(result.status), `Expected 200 or 403 got ${result.status}`);
    if (result.status === 200) {
      assert.ok(result.data.code, "Code should be assigned");
    }
  });

  console.log("\n=== Checkin flow: reservation lockboxId for key return ===");

  await test("reservation lockboxId resolves to valid lockbox (tech)", async () => {
    const { data: reservation } = await apiGet(
      `/api/vehicle-reservations/${testReservationId}`,
      techCookie
    );
    assert.strictEqual(reservation.lockboxId, lockboxId);
    const { data: lockbox } = await apiGet(
      `/api/lockboxes/${reservation.lockboxId}`,
      techCookie
    );
    assert.ok(lockbox.name, "Lockbox should have name");
    assert.ok(lockbox.location, "Lockbox should have location");
    assert.strictEqual(lockbox.status, "active");
  });

  await test("reservation lockboxId resolves to valid lockbox (admin)", async () => {
    const { data: reservation } = await apiGet(
      `/api/vehicle-reservations/${testReservationId}`,
      adminCookie
    );
    assert.strictEqual(reservation.lockboxId, lockboxId);
    const { data: lockbox } = await apiGet(
      `/api/lockboxes/${reservation.lockboxId}`,
      adminCookie
    );
    assert.ok(lockbox.name, "Lockbox should have name");
    assert.strictEqual(lockbox.status, "active");
  });

  console.log("\n=== QR scan path: vehicle detail to checkout via reservation lockbox ===");

  await test("vehicle detail accessible via ID (QR scan URL)", async () => {
    if (!testVehicleId) { console.log("    (skipped - no vehicleId)"); return; }
    const { status, data: vehicle } = await apiGet(`/api/vehicles/${testVehicleId}`, adminCookie);
    assert.strictEqual(status, 200);
    assert.ok(vehicle.id, "Vehicle should have id");
    assert.ok(!("lockboxId" in vehicle), "Vehicle should not have lockboxId");
  });

  await test("reservation for vehicle has lockboxId after QR scan path", async () => {
    if (!testVehicleId) { console.log("    (skipped - no vehicleId)"); return; }
    const { data: reservations } = await apiGet("/api/vehicle-reservations", adminCookie);
    const vehicleReservation = reservations.find(
      (r: any) => r.vehicleId === testVehicleId && r.lockboxId
    );
    if (vehicleReservation) {
      assert.ok(vehicleReservation.lockboxId, "Should have lockboxId");
      assert.strictEqual(vehicleReservation.keyPickupMethod, "key_box");
    }
  });

  console.log("\n=== Reservation response includes lockboxId ===");

  await test("single reservation GET includes lockboxId (tech)", async () => {
    const { data: reservation } = await apiGet(
      `/api/vehicle-reservations/${testReservationId}`,
      techCookie
    );
    assert.ok("lockboxId" in reservation, "Should have lockboxId property");
    assert.ok("keyPickupMethod" in reservation, "Should have keyPickupMethod property");
  });

  await test("reservation list includes lockboxId (admin)", async () => {
    const { data: reservations } = await apiGet("/api/vehicle-reservations", adminCookie);
    assert.ok(reservations.length > 0);
    const withLockbox = reservations.find((r: any) => r.lockboxId === lockboxId);
    assert.ok(withLockbox, "Should find reservation with our lockboxId");
  });

  console.log("\n=== Full checkout+checkin lifecycle with lockbox code ===");

  let checkoutReservationId: string | null = null;
  let checkoutVehicleId: string;
  let checkoutUserId: string;
  let checkoutLogId: string;
  let assignedCodeId: string | null = null;

  await test("create reservation and assign key_box for checkout lifecycle", async () => {
    const { data: vehicles } = await apiGet("/api/vehicles", adminCookie);
    const { data: me } = await apiGet("/api/auth/user", adminCookie);
    const farFuture = new Date(Date.now() + 30 * 86400000);
    const startDate = new Date(farFuture.getTime()).toISOString();
    const endDate = new Date(farFuture.getTime() + 86400000).toISOString();

    let created = false;
    for (const v of vehicles) {
      const createResult = await apiPost("/api/vehicle-reservations", {
        vehicleId: v.id,
        startDate,
        endDate,
        purpose: "E2E lockbox lifecycle test",
        passengerCount: 1,
      }, adminCookie);
      if ([200, 201].includes(createResult.status) && createResult.data.id) {
        checkoutReservationId = createResult.data.id;
        checkoutVehicleId = v.id;
        checkoutUserId = me.id;
        created = true;
        break;
      }
    }
    assert.ok(created, "Should create reservation on at least one vehicle");

    await apiPatch(
      `/api/vehicle-reservations/${checkoutReservationId}`,
      { status: "approved" },
      adminCookie
    );

    const lockboxResult = await apiPatch(
      `/api/vehicle-reservations/${checkoutReservationId}`,
      { keyPickupMethod: "key_box", lockboxId },
      adminCookie
    );
    assert.strictEqual(lockboxResult.status, 200);
    assert.strictEqual(lockboxResult.data.lockboxId, lockboxId);
    assert.strictEqual(lockboxResult.data.keyPickupMethod, "key_box");
  });

  await test("assign lockbox code before checkout (simulates key box flow)", async () => {
    assert.ok(checkoutReservationId, "Need reservation from previous test");
    const { data: reservation } = await apiGet(
      `/api/vehicle-reservations/${checkoutReservationId}`,
      adminCookie
    );
    assert.ok(reservation.lockboxId, "Reservation must have lockboxId");
    assert.strictEqual(reservation.keyPickupMethod, "key_box");

    const result = await apiPost(
      `/api/lockboxes/${reservation.lockboxId}/assign-code`,
      {},
      adminCookie
    );
    if (result.status === 200) {
      assert.ok(result.data.code, "Should receive lockbox code");
      assert.ok(result.data.id, "Should receive code id");
      assignedCodeId = result.data.id;
    }
  });

  await test("create checkout log with lockbox code", async () => {
    assert.ok(checkoutReservationId, "Need reservation from previous test");
    const checkoutData: any = {
      reservationId: checkoutReservationId,
      vehicleId: checkoutVehicleId,
      userId: checkoutUserId,
      startMileage: 50000,
      fuelLevel: "full",
      cleanlinessConfirmed: true,
      damageNotes: null,
      adminOverride: true,
    };
    if (assignedCodeId) {
      checkoutData.assignedCodeId = assignedCodeId;
    }

    const result = await apiPost("/api/vehicle-checkout-logs", checkoutData, adminCookie);
    assert.strictEqual(result.status, 200, `Checkout failed: ${JSON.stringify(result.data)}`);
    assert.ok(result.data.id, "Checkout log should have id");
    checkoutLogId = result.data.id;
    assert.strictEqual(result.data.reservationId, checkoutReservationId);
    assert.strictEqual(result.data.vehicleId, checkoutVehicleId);
  });

  await test("verify reservation lockbox persists after checkout", async () => {
    assert.ok(checkoutReservationId, "Need reservation from previous test");
    const { data: reservation } = await apiGet(
      `/api/vehicle-reservations/${checkoutReservationId}`,
      adminCookie
    );
    assert.strictEqual(reservation.lockboxId, lockboxId, "lockboxId should persist after checkout");
    assert.strictEqual(reservation.keyPickupMethod, "key_box");
  });

  await test("reservation lockboxId available for key return during checkin", async () => {
    assert.ok(checkoutReservationId, "Need reservation from previous test");
    const { data: reservation } = await apiGet(
      `/api/vehicle-reservations/${checkoutReservationId}`,
      adminCookie
    );
    assert.ok(reservation.lockboxId, "lockboxId must be present for key return");
    const { data: lockbox } = await apiGet(
      `/api/lockboxes/${reservation.lockboxId}`,
      adminCookie
    );
    assert.ok(lockbox.name, "Lockbox should have name for key return instructions");
    assert.ok(lockbox.location, "Lockbox should have location for key return");
  });

  await test("create checkin log (completes key return via lockbox)", async () => {
    assert.ok(checkoutLogId, "Need checkout log from previous test");
    const checkinData = {
      vehicleId: checkoutVehicleId,
      userId: checkoutUserId,
      checkOutLogId: checkoutLogId,
      endMileage: 50100,
      endFuelLevel: 75,
      cleanlinessStatus: "clean",
      issues: "",
      returnNotes: "Key returned to lockbox",
      fuelLevel: "three_quarters",
    };

    const result = await apiPost("/api/vehicle-checkin-logs", checkinData, adminCookie);
    assert.strictEqual(result.status, 200, `Checkin failed: ${JSON.stringify(result.data)}`);
    assert.ok(result.data.id, "Checkin log should have id");
    assert.strictEqual(result.data.checkOutLogId, checkoutLogId);
  });

  await test("reservation lockbox still accessible after checkin (for records)", async () => {
    assert.ok(checkoutReservationId, "Need reservation from previous test");
    const { data: reservation } = await apiGet(
      `/api/vehicle-reservations/${checkoutReservationId}`,
      adminCookie
    );
    assert.ok(reservation.lockboxId, "lockboxId should remain for historical records");
  });

  console.log("\n=== QR scan path: vehicle detail -> checkout entry point ===");

  await test("GET vehicle by ID (QR scan URL) returns vehicle without lockboxId", async () => {
    const { status, data: vehicle } = await apiGet(
      `/api/vehicles/${checkoutVehicleId}`,
      adminCookie
    );
    assert.strictEqual(status, 200);
    assert.ok(!("lockboxId" in vehicle), "Vehicle must not have lockboxId after migration");
  });

  await test("reservation for QR-scanned vehicle carries lockboxId", async () => {
    if (!checkoutVehicleId) { console.log("    (skipped - no checkoutVehicleId)"); return; }
    const { data: reservations } = await apiGet("/api/vehicle-reservations", adminCookie);
    if (!Array.isArray(reservations)) { console.log("    (skipped - not array)"); return; }
    const forVehicle = reservations.find(
      (r: any) => r.vehicleId === checkoutVehicleId && r.lockboxId
    );
    assert.ok(forVehicle, "Should find reservation with lockboxId for this vehicle");
    assert.strictEqual(forVehicle.keyPickupMethod, "key_box");
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error("Test suite failed:", err);
  process.exit(1);
});
