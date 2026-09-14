import assert from "node:assert";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function login(username: string, password: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    redirect: "manual",
  });
  const cookies: string[] =
    typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const sessionCookie = cookies.find((c) => c.startsWith("connect.sid"));
  if (!sessionCookie) {
    throw new Error(`Login failed for ${username} (status ${res.status})`);
  }
  return sessionCookie.split(";")[0];
}

async function run() {
  console.log("\n=== Public Report API E2E ===\n");

  const unauthRequests = await fetch(`${BASE_URL}/api/service-requests`);
  assert.strictEqual(unauthRequests.status, 401, "authenticated request list must stay private");

  const unauthUpload = await fetch(`${BASE_URL}/api/objects/upload`, { method: "POST" });
  assert.strictEqual(unauthUpload.status, 401, "authenticated upload signing must stay private");

  const propertiesRes = await fetch(`${BASE_URL}/api/public/properties`);
  assert.strictEqual(propertiesRes.status, 200);
  const properties = await propertiesRes.json();
  assert.ok(Array.isArray(properties), "public properties should be an array");
  assert.ok(properties.length > 0, "need at least one property to report against");
  const property = properties[0];
  assert.ok(property.id && property.name, "public property should only expose location fields");
  assert.equal("imageUrl" in property, false, "public property list should not include imageUrl");

  const spacesRes = await fetch(`${BASE_URL}/api/public/spaces?propertyId=${property.id}`);
  assert.strictEqual(spacesRes.status, 200);
  const spaces = await spacesRes.json();
  assert.ok(Array.isArray(spaces));
  const spaceId = spaces[0]?.id;

  const invalidRes = await fetch(`${BASE_URL}/api/public/service-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Missing location" }),
  });
  assert.strictEqual(invalidRes.status, 400);

  const signRes = await fetch(`${BASE_URL}/api/public/objects/upload`, { method: "POST" });
  assert.strictEqual(signRes.status, 200);
  const sign = await signRes.json();
  assert.ok(sign.uploadURL, "public uploadURL required");
  assert.ok(sign.objectPath, "public objectPath required");

  const putRes = await fetch(sign.uploadURL, {
    method: "PUT",
    body: new TextEncoder().encode("public report photo"),
    headers: { "Content-Type": "image/jpeg" },
  });
  assert.ok(putRes.ok, `Public storage PUT failed: ${putRes.status}`);

  const title = `Public e2e leak ${Date.now()}`;
  const createRes = await fetch(`${BASE_URL}/api/public/service-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      description: "Water is pooling under the sink in the first-floor restroom.",
      propertyId: property.id,
      spaceId,
      urgency: "high",
      requesterName: "Alex Rivera",
      requesterPhone: "555-0199",
      photos: [
        {
          fileName: "public-e2e.jpg",
          fileType: "image/jpeg",
          objectUrl: sign.uploadURL.split("?")[0],
          objectPath: sign.objectPath,
        },
      ],
    }),
  });
  const createText = await createRes.text();
  assert.strictEqual(createRes.status, 200, createText);
  const created = JSON.parse(createText);
  assert.ok(created.id, "created request id required");
  assert.strictEqual(created.title, title);
  assert.strictEqual(created.requesterName, "Alex Rivera");
  assert.strictEqual(created.requesterPhone, "555-0199");
  assert.ok(!created.requesterId, "public reports should not create a user");
  assert.strictEqual(created.propertyId, property.id);
  if (spaceId) assert.strictEqual(created.spaceId, spaceId);

  const cookie = await login("admin", "123456");
  const headers = { Cookie: cookie };

  const detailRes = await fetch(`${BASE_URL}/api/service-requests/${created.id}`, { headers });
  assert.strictEqual(detailRes.status, 200);
  const detail = await detailRes.json();
  assert.strictEqual(detail.requesterName, "Alex Rivera");
  assert.strictEqual(detail.requesterPhone, "555-0199");
  assert.strictEqual(detail.propertyId, property.id);

  const listRes = await fetch(`${BASE_URL}/api/service-requests`, { headers });
  assert.strictEqual(listRes.status, 200);
  const list = await listRes.json();
  assert.ok(list.some((request: { id: string }) => request.id === created.id), "admin list should include the public report");

  const uploadsRes = await fetch(`${BASE_URL}/api/uploads/request/${created.id}`, { headers });
  assert.strictEqual(uploadsRes.status, 200);
  const uploads = await uploadsRes.json();
  assert.ok(
    uploads.some((upload: { objectPath?: string; fileName?: string }) =>
      upload.objectPath === sign.objectPath || upload.fileName === "public-e2e.jpg"
    ),
    "photo should be linked to the service request",
  );

  console.log(`  ✓ Public report create + admin visibility (${created.id})`);
  console.log("\n=== Results: 1 passed ===\n");
}

run().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
