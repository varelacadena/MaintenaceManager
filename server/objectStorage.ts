import { StorageClient } from "@supabase/storage-js";

function getSupabaseProjectUrl(): string {
  const url = process.env.SUPABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "SUPABASE_URL is not set. Set it to your project URL (e.g. https://<ref>.supabase.co)."
    );
  }
  return url.replace(/\/+$/, "");
}

function getServiceRoleKey(): string {
  const key =
    process.env.SUPABASE_SERVICE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_KEY is not set. Use the Supabase service role key (server-side only)."
    );
  }
  return key;
}

/** Bucket name for private uploads. Prefer SUPABASE_STORAGE_BUCKET; DEFAULT_OBJECT_STORAGE_BUCKET_ID is accepted for migration from Replit. */
function getBucketName(): string {
  const bucket =
    process.env.SUPABASE_STORAGE_BUCKET?.trim() ||
    process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID?.trim();
  if (!bucket) {
    throw new Error(
      "SUPABASE_STORAGE_BUCKET is not set (or set DEFAULT_OBJECT_STORAGE_BUCKET_ID to the Supabase bucket name)."
    );
  }
  return bucket;
}

let storageClient: StorageClient | null = null;

function getStorageClient(): StorageClient {
  if (!storageClient) {
    const base = getSupabaseProjectUrl();
    const storageUrl = new URL("/storage/v1", `${base}/`).toString();
    const key = getServiceRoleKey();
    storageClient = new StorageClient(storageUrl, {
      apikey: key,
      Authorization: `Bearer ${key}`,
    });
  }
  return storageClient;
}

/** Returns the configured bucket name when Supabase storage env is complete; otherwise null. */
export function getBucketId(): string | null {
  try {
    getSupabaseProjectUrl();
    getServiceRoleKey();
    return getBucketName();
  } catch {
    return null;
  }
}

/** Legacy Replit/GCS private prefix; kept for parsing old object URLs in the image proxy. */
export function getPrivateDir(): string | null {
  return process.env.PRIVATE_OBJECT_DIR?.trim() || null;
}

export async function getSignedUploadUrl(): Promise<{
  uploadURL: string;
  objectPath: string;
}> {
  const objectPath = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const { data, error } = await getStorageClient()
    .from(getBucketName())
    .createSignedUploadUrl(objectPath, { upsert: true });

  if (error) {
    console.error("createSignedUploadUrl:", error);
    throw error;
  }
  if (!data?.signedUrl) {
    throw new Error("createSignedUploadUrl returned no signedUrl");
  }

  return { uploadURL: data.signedUrl, objectPath };
}

export async function getDownloadUrl(key: string): Promise<string> {
  const path = key.replace(/^\/+/, "");
  const { data, error } = await getStorageClient()
    .from(getBucketName())
    .createSignedUrl(path, 3600);

  if (error) {
    console.error("createSignedUrl:", error);
    throw error;
  }
  if (!data?.signedUrl) {
    throw new Error("createSignedUrl returned no signedUrl");
  }
  return data.signedUrl;
}
