import type { Response } from "express";
import { storage } from "./storage";
import { canAccessTask } from "./middleware";
import { canAccessServiceRequest } from "./routeUtils";
import { insertUploadSchema } from "@shared/schema";
import { isAllowedObjectPath } from "@shared/publicServiceRequest";
import { canManageFleet } from "@shared/techPermissions";

const parentFields = [
  "taskId",
  "requestId",
  "equipmentId",
  "projectId",
  "projectCommentId",
  "vehicleCheckOutLogId",
  "vehicleCheckInLogId",
] as const;

function getProvidedParents(body: Record<string, unknown>) {
  return parentFields.filter((field) => Boolean(body[field]));
}

export async function assertCanRegisterUpload(
  userId: string,
  body: Record<string, unknown>
): Promise<{ status: number; message: string } | null> {
  const currentUser = await storage.getUser(userId);
  if (!currentUser) {
    return { status: 401, message: "User not found" };
  }

  const providedParents = getProvidedParents(body);
  if (providedParents.length === 0) {
    return { status: 400, message: "Upload must be attached to a parent record" };
  }
  const conflictingParents = providedParents.filter(
    (field) => !(field === "projectId" && body.projectCommentId)
  );
  if (conflictingParents.length > 1) {
    return { status: 400, message: "Upload can only be attached to one parent record" };
  }

  if (body.taskId) {
    const hasAccess = await canAccessTask(userId, body.taskId as string);
    if (!hasAccess && currentUser.role !== "admin") {
      return { status: 403, message: "You don't have access to this task" };
    }
  } else if (body.requestId) {
    const request = await storage.getServiceRequest(body.requestId as string);
    if (!request) return { status: 404, message: "Service request not found" };
    const hasRequestAccess = await canAccessServiceRequest(userId, body.requestId as string);
    if (!hasRequestAccess && currentUser.role !== "admin") {
      return { status: 403, message: "You don't have access to this request" };
    }
  } else if (body.equipmentId) {
    if (currentUser.role !== "admin") {
      return { status: 403, message: "Only admins can attach files to equipment" };
    }
    const equipment = await storage.getEquipmentItem(body.equipmentId as string);
    if (!equipment) {
      return { status: 404, message: "Equipment not found" };
    }
  } else if (body.projectCommentId) {
    if (currentUser.role !== "admin") {
      return { status: 403, message: "Only admins can attach files to project comments" };
    }
    const comment = await storage.getProjectComment(body.projectCommentId as string);
    if (!comment) {
      return { status: 404, message: "Project comment not found" };
    }
    if (body.projectId && comment.projectId !== body.projectId) {
      return { status: 400, message: "Project comment does not belong to this project" };
    }
  } else if (body.projectId) {
    if (currentUser.role !== "admin") {
      return { status: 403, message: "Only admins can attach files to projects" };
    }
    const project = await storage.getProject(body.projectId as string);
    if (!project) {
      return { status: 404, message: "Project not found" };
    }
  } else if (body.vehicleCheckOutLogId) {
    const log = await storage.getVehicleCheckOutLog(body.vehicleCheckOutLogId as string);
    if (!log) return { status: 404, message: "Vehicle check-out log not found" };
    if (log.userId !== userId && !canManageFleet(currentUser)) {
      return { status: 403, message: "You don't have access to this check-out" };
    }
  } else if (body.vehicleCheckInLogId) {
    const log = await storage.getVehicleCheckInLog(body.vehicleCheckInLogId as string);
    if (!log) return { status: 404, message: "Vehicle check-in log not found" };
    if (log.userId !== userId && !canManageFleet(currentUser)) {
      return { status: 403, message: "You don't have access to this check-in" };
    }
  }

  return null;
}

export async function assertCanDownloadUpload(
  userId: string,
  upload: {
    uploadedById: string | null;
    requestId?: string | null;
    taskId?: string | null;
    equipmentId?: string | null;
    projectId?: string | null;
    projectCommentId?: string | null;
    vehicleCheckOutLogId?: string | null;
    vehicleCheckInLogId?: string | null;
  }
): Promise<boolean> {
  const user = await storage.getUser(userId);
  if (!user) return false;

  if (upload.projectId || upload.projectCommentId) {
    return user.role === "admin";
  }

  if (user.role === "admin") return true;

  if (upload.uploadedById === userId) return true;

  if (upload.requestId) {
    if (await canAccessServiceRequest(userId, upload.requestId)) return true;
  }

  if (upload.taskId) {
    if (await canAccessTask(userId, upload.taskId)) return true;
  }

  if (upload.equipmentId) {
    return user.role === "technician";
  }

  if (upload.vehicleCheckOutLogId) {
    const checkOutLog = await storage.getVehicleCheckOutLog(upload.vehicleCheckOutLogId);
    if (checkOutLog?.userId === userId) return true;
  }

  if (upload.vehicleCheckInLogId) {
    const checkInLog = await storage.getVehicleCheckInLog(upload.vehicleCheckInLogId);
    if (checkInLog?.userId === userId) return true;
  }

  return false;
}

async function resolveObjectUrl(body: Record<string, unknown>): Promise<string | { error: { status: number; message: string } }> {
  const objectPath = body.objectPath as string | undefined;
  if (objectPath && !isAllowedObjectPath(objectPath)) {
    return { error: { status: 400, message: "Invalid upload path" } };
  }
  if (objectPath) {
    try {
      const { getDownloadUrl, getBucketId } = await import("./objectStorage");
      if (getBucketId()) {
        return await getDownloadUrl(objectPath);
      }
    } catch {
      // fall through to objectUrl handling
    }
  }

  let objectUrl = body.objectUrl as string;
  if (objectUrl.includes("mock-storage.local") && objectPath) {
    try {
      const { getDownloadUrl, getBucketId } = await import("./objectStorage");
      if (getBucketId()) {
        objectUrl = await getDownloadUrl(objectPath);
      }
    } catch {
      // keep original url
    }
  }
  return objectUrl;
}

function isResolveError(
  value: string | { error: { status: number; message: string } },
): value is { error: { status: number; message: string } } {
  return typeof value === "object" && value !== null && "error" in value;
}

export async function registerUpload(
  userId: string,
  body: Record<string, unknown>
) {
  const authError = await assertCanRegisterUpload(userId, body);
  if (authError) {
    return { error: authError };
  }

  const errors: { field: string; message: string }[] = [];
  if (!body.fileName) errors.push({ field: "fileName", message: "fileName is required" });
  if (!body.objectUrl) errors.push({ field: "objectUrl", message: "objectUrl is required" });
  if (!body.fileType) errors.push({ field: "fileType", message: "fileType is required" });
  if (errors.length > 0) {
    return { error: { status: 400, message: "Invalid upload data", errors } };
  }

  const objectUrl = await resolveObjectUrl(body);
  if (isResolveError(objectUrl)) {
    return objectUrl;
  }
  const uploadData = insertUploadSchema.parse({
    ...body,
    objectUrl,
    uploadedById: userId,
  });
  const upload = await storage.createUpload(uploadData);
  return { upload };
}

export async function registerPublicRequestUpload(
  requestId: string,
  uploadedByName: string,
  body: Record<string, unknown>
) {
  const errors: { field: string; message: string }[] = [];
  if (!body.fileName) errors.push({ field: "fileName", message: "fileName is required" });
  if (!body.objectUrl) errors.push({ field: "objectUrl", message: "objectUrl is required" });
  if (!body.fileType) errors.push({ field: "fileType", message: "fileType is required" });
  if (errors.length > 0) {
    return { error: { status: 400, message: "Invalid upload data", errors } };
  }

  const objectUrl = await resolveObjectUrl(body);
  if (isResolveError(objectUrl)) {
    return objectUrl;
  }
  const uploadData = insertUploadSchema.parse({
    fileName: body.fileName,
    fileType: body.fileType,
    objectPath: body.objectPath,
    objectUrl,
    requestId,
    uploadedById: null,
    uploadedByName,
  });
  const upload = await storage.createUpload(uploadData);
  return { upload };
}

export function sendUploadAuthError(res: Response, error: { status: number; message: string; errors?: unknown }) {
  return res.status(error.status).json(
    error.errors ? { message: error.message, errors: error.errors } : { message: error.message }
  );
}
