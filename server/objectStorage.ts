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

function decodeStoragePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * Parse a Supabase project storage URL into bucket + object path for createSignedUrl.
 * Handles standard object URLs, signed-upload object URLs (`.../object/upload/sign/...`),
 * and image-transformation (render) URLs.
 */
export function parseSupabaseStorageUrl(rawUrl: string): {
  bucket: string;
  objectPath: string;
} | null {
  if (!rawUrl.includes(".supabase.co/storage/")) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  const pathname = url.pathname;

  const uploadSignMatch = pathname.match(
    /^\/storage\/v1\/object\/upload\/sign\/([^/]+)\/(.+)$/
  );
  if (uploadSignMatch?.[1] && uploadSignMatch[2]) {
    return {
      bucket: uploadSignMatch[1],
      objectPath: decodeStoragePathSegment(uploadSignMatch[2]),
    };
  }

  const objectMatch = pathname.match(
    /^\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/
  );
  if (objectMatch?.[1] && objectMatch[2]) {
    return {
      bucket: objectMatch[1],
      objectPath: decodeStoragePathSegment(objectMatch[2]),
    };
  }

  const renderMatch = pathname.match(
    /^\/storage\/v1\/render\/image\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/
  );
  if (renderMatch?.[1] && renderMatch[2]) {
    return {
      bucket: renderMatch[1],
      objectPath: decodeStoragePathSegment(renderMatch[2]),
    };
  }

  return null;
}

export async function getDownloadUrl(
  key: string,
  bucketOverride?: string
): Promise<string> {
  const path = key.replace(/^\/+/, "");
  const bucket = bucketOverride?.trim() || getBucketName();
  const { data, error } = await getStorageClient()
    .from(bucket)
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
