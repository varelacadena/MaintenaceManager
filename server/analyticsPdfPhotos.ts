import { and, desc, inArray, sql } from "drizzle-orm";
import { uploads } from "@shared/schema";
import { db } from "./db";
import { getDownloadUrl } from "./objectStorage";

export const PHOTO_JOB_CAP = 40;
const PHOTOS_PER_JOB = 2;

export type PhotoUploadRow = {
  taskId: string | null;
  fileName: string;
  label: string | null;
  createdAt: Date | string | null;
};

export type PhotoJobSeed = {
  taskId: string;
  title: string;
  meta: string;
  completedAt: string | null;
};

export type PreparedPhoto = {
  caption: string;
  jpeg: string;
  width: number;
  height: number;
};

export type PreparedPhotoJob = {
  title: string;
  meta: string;
  countLine: string;
  images: PreparedPhoto[];
};

function photoTime(value: Date | string | null): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function photoCountLine(shown: number, total: number): string {
  if (shown >= total) {
    return total === 1 ? "1 photo on this job." : `${total} photos on this job.`;
  }
  if (shown === 1) return `1 of ${total} photos. The newest is printed.`;
  return `${shown} of ${total} photos. The newest two are printed.`;
}

export function groupTaskPhotos<T extends PhotoUploadRow>(
  rows: T[],
  taskIdsInOrder: string[],
  perTask = PHOTOS_PER_JOB,
): { taskId: string; shown: T[]; total: number }[] {
  const byTask = new Map<string, T[]>();
  for (const row of rows) {
    if (!row.taskId) continue;
    const list = byTask.get(row.taskId) ?? [];
    list.push(row);
    byTask.set(row.taskId, list);
  }
  for (const list of Array.from(byTask.values())) {
    list.sort((a, b) => photoTime(b.createdAt) - photoTime(a.createdAt));
  }
  return taskIdsInOrder.flatMap((taskId) => {
    const all = byTask.get(taskId);
    if (!all?.length) return [];
    return [{ taskId, shown: all.slice(0, perTask), total: all.length }];
  });
}

export function orderedFinishedJobs(seeds: PhotoJobSeed[]): PhotoJobSeed[] {
  const seen = new Set<string>();
  return [...seeds]
    .filter((seed) => {
      if (!seed.taskId || seen.has(seed.taskId)) return false;
      seen.add(seed.taskId);
      return true;
    })
    .sort((a, b) => photoTime(b.completedAt) - photoTime(a.completedAt));
}

async function toJpeg(bytes: Buffer): Promise<{ jpeg: Buffer; width: number; height: number } | null> {
  try {
    const sharp = (await import("sharp")).default;
    const jpeg = await sharp(bytes, { failOn: "none" })
      .rotate()
      .resize({ width: 900, height: 700, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 62 })
      .toBuffer();
    const meta = await sharp(jpeg).metadata();
    if (!meta.width || !meta.height) return null;
    return { jpeg, width: meta.width, height: meta.height };
  } catch (error) {
    console.error("Could not prepare a task photo for the PDF:", error);
    return null;
  }
}

async function downloadUpload(objectPath: string | null, objectUrl: string): Promise<Buffer | null> {
  if (!objectPath || objectUrl.includes("mock-storage.local")) return null;
  try {
    const url = await getDownloadUrl(objectPath);
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    console.error("Could not download a task photo:", error);
    return null;
  }
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

export async function prepareFinishedJobPhotos(seeds: PhotoJobSeed[]): Promise<{
  jobs: PreparedPhotoJob[];
  note: string | null;
}> {
  const ordered = orderedFinishedJobs(seeds);
  if (ordered.length === 0) return { jobs: [], note: null };

  const rows = await db
    .select({
      taskId: uploads.taskId,
      fileName: uploads.fileName,
      label: uploads.label,
      createdAt: uploads.createdAt,
      objectPath: uploads.objectPath,
      objectUrl: uploads.objectUrl,
    })
    .from(uploads)
    .where(
      and(
        inArray(
          uploads.taskId,
          ordered.map((seed) => seed.taskId),
        ),
        sql`lower(${uploads.fileType}) like 'image/%'`,
      ),
    )
    .orderBy(desc(uploads.createdAt));

  const grouped = groupTaskPhotos(rows, ordered.map((seed) => seed.taskId));
  const selected = grouped.slice(0, PHOTO_JOB_CAP);
  const note =
    grouped.length > PHOTO_JOB_CAP
      ? `Showing the ${PHOTO_JOB_CAP} most recently finished jobs that have photos.`
      : null;

  const seedById = new Map(ordered.map((seed) => [seed.taskId, seed]));
  const jobs: PreparedPhotoJob[] = [];

  for (const group of selected) {
    const seed = seedById.get(group.taskId);
    if (!seed) continue;
    const prepared = await mapPool(group.shown, 4, async (row) => {
      const bytes = await downloadUpload(row.objectPath, row.objectUrl);
      if (!bytes) return null;
      const jpeg = await toJpeg(bytes);
      if (!jpeg) return null;
      return {
        caption: (row.label || row.fileName).trim() || row.fileName,
        jpeg: jpeg.jpeg.toString("base64"),
        width: jpeg.width,
        height: jpeg.height,
      } satisfies PreparedPhoto;
    });
    const imagesForJob = prepared.filter((image): image is PreparedPhoto => image !== null);
    if (imagesForJob.length === 0) continue;
    jobs.push({
      title: seed.title,
      meta: seed.meta,
      countLine: photoCountLine(imagesForJob.length, group.total),
      images: imagesForJob,
    });
  }

  return { jobs, note };
}
