import assert from "node:assert";

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
let passed = 0;
let failed = 0;

async function login(username: string, password: string): Promise<{ cookie: string; user: any }> {
  const res = await fetch(`${BASE_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    redirect: "manual",
  });
  const body = await res.json();
  const rawHeaders = res.headers;
  const cookies: string[] = [];
  rawHeaders.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") cookies.push(value);
  });
  if (cookies.length === 0 && typeof rawHeaders.getSetCookie === "function") {
    cookies.push(...rawHeaders.getSetCookie());
  }
  const sessionCookie = cookies.find((c: string) => c.startsWith("connect.sid"));
  if (!sessionCookie) {
    throw new Error(`Login failed for ${username} (status ${res.status}): ${JSON.stringify(body).substring(0, 200)}`);
  }
  return { cookie: sessionCookie.split(";")[0], user: body.user };
}

async function apiGet(path: string, cookie: string) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: { Cookie: cookie } });
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

async function apiPost(path: string, body: any, cookie: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

async function run() {
  console.log("\n=== Project File Upload E2E Tests ===\n");

  const { cookie } = await login("admin", "123456");

  const projectsRes = await apiGet("/api/projects", cookie);
  assert.strictEqual(projectsRes.status, 200, "Should fetch projects");
  assert.ok(Array.isArray(projectsRes.data), "Projects should be an array");
  assert.ok(projectsRes.data.length > 0, "Should have at least one project");
  const projectId = projectsRes.data[0].id;
  console.log(`Using project: ${projectsRes.data[0].name} (${projectId})`);

  await test("POST /api/objects/upload returns signed upload URL", async () => {
    const res = await apiPost("/api/objects/upload", {}, cookie);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert.ok(res.data.uploadURL, "Should return uploadURL");
    assert.ok(res.data.objectPath, "Should return objectPath");
  });

  await test("Direct file upload to project (Files tab flow)", async () => {
    const uploadRes = await apiPost("/api/objects/upload", {}, cookie);
    assert.strictEqual(uploadRes.status, 200);
    const { uploadURL, objectPath } = uploadRes.data;

    const fileContent = new TextEncoder().encode("e2e direct upload test content");
    const putRes = await fetch(uploadURL, {
      method: "PUT",
      body: fileContent,
      headers: { "Content-Type": "text/plain" },
    });
    assert.ok(putRes.ok, `PUT to signed URL should succeed, got ${putRes.status}`);

    const createRes = await apiPost(`/api/projects/${projectId}/uploads`, {
      fileName: "e2e-direct-upload.txt",
      fileType: "text/plain",
      objectUrl: uploadURL.split("?")[0],
      objectPath,
    }, cookie);
    assert.strictEqual(createRes.status, 201, `Expected 201, got ${createRes.status}: ${JSON.stringify(createRes.data).substring(0, 300)}`);
    assert.ok(createRes.data.id, "Should return upload record with id");
    assert.strictEqual(createRes.data.fileName, "e2e-direct-upload.txt");
    assert.strictEqual(createRes.data.projectId, projectId);
  });

  await test("File attached to comment (comment attachment flow)", async () => {
    const uploadRes = await apiPost("/api/objects/upload", {}, cookie);
    assert.strictEqual(uploadRes.status, 200);
    const { uploadURL, objectPath } = uploadRes.data;

    const fileContent = new TextEncoder().encode("e2e comment attachment content");
    const putRes = await fetch(uploadURL, {
      method: "PUT",
      body: fileContent,
      headers: { "Content-Type": "text/plain" },
    });
    assert.ok(putRes.ok, `PUT to signed URL should succeed, got ${putRes.status}`);

    const commentRes = await apiPost(`/api/projects/${projectId}/comments`, {
      content: "E2E test: file attached to comment",
    }, cookie);
    assert.strictEqual(commentRes.status, 201, `Comment creation should return 201, got ${commentRes.status}`);
    const comment = commentRes.data;

    const createRes = await apiPost(`/api/projects/${projectId}/uploads`, {
      fileName: "e2e-comment-attach.txt",
      fileType: "text/plain",
      objectUrl: uploadURL.split("?")[0],
      objectPath,
      projectCommentId: comment.id,
    }, cookie);
    assert.strictEqual(createRes.status, 201, `Expected 201, got ${createRes.status}: ${JSON.stringify(createRes.data).substring(0, 300)}`);
    assert.ok(createRes.data.id, "Should return upload record with id");
    assert.strictEqual(createRes.data.projectCommentId, comment.id);
  });

  await test("Uploaded files appear in project uploads list", async () => {
    const res = await apiGet(`/api/projects/${projectId}/uploads`, cookie);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert.ok(Array.isArray(res.data), "Uploads should be an array");
    const directUpload = res.data.find((u: any) => u.fileName === "e2e-direct-upload.txt");
    assert.ok(directUpload, "Direct upload file should be in the list");
    const commentUpload = res.data.find((u: any) => u.fileName === "e2e-comment-attach.txt");
    assert.ok(commentUpload, "Comment attachment file should be in the list");
  });

  await test("Uploaded file can be opened/downloaded via object URL", async () => {
    const res = await apiGet(`/api/projects/${projectId}/uploads`, cookie);
    assert.strictEqual(res.status, 200);
    const uploads = res.data;
    assert.ok(uploads.length > 0, "Should have uploads");

    const upload = uploads.find((u: any) => u.objectPath);
    if (upload) {
      const imageRes = await fetch(
        `${BASE_URL}/api/objects/image?path=${encodeURIComponent(upload.objectPath)}`,
        { headers: { Cookie: cookie } }
      );
      assert.strictEqual(imageRes.status, 200, `File download should return 200, got ${imageRes.status}`);
    }
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
