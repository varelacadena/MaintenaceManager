const configuredBase = process.env.BASE_URL;
export const BASE_URL = configuredBase && configuredBase.startsWith("http") ? configuredBase : "http://localhost:3000";

export const adminAccount = { username: "admin", password: "123456" };
export const technicianAccount = { username: "Varela", password: "123456" };

export async function login(username: string, password: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    redirect: "manual",
  });
  const cookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const sessionCookie = cookies.find((cookie) => cookie.startsWith("connect.sid"));
  if (!sessionCookie) {
    const text = await res.text();
    throw new Error(`Login failed for ${username} (${res.status}): ${text.slice(0, 180)}`);
  }
  return sessionCookie.split(";")[0];
}

export async function api(method: string, path: string, cookie: string, body?: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Cookie: cookie,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

export async function run(title: string, fn: () => Promise<void>) {
  console.log(`\n=== ${title} ===\n`);
  try {
    await fn();
    console.log("PASS");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
