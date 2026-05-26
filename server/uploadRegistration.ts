import type { Response } from "express";
import { storage } from "./storage";
import { canAccessTask } from "./middleware";
import { canAccessServiceRequest } from "./routeUtils";
import { insertUploadSchema } from "@shared/schema";
export async function assertCanRegisterUpload(
  userId: string,
  body: Record<string, unknown>
): Promise<{ status: number; message: string } | null> {
  const currentUser = await storage.getUser(userId);
  if (!currentUser) {
    return { status: 401, message: "User not found" };
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
  }

  return null;
}

export async function assertCanDownloadUpload(
  userId: string,
  upload: {
    uploadedById: string;
    requestId?: string | null;
    taskId?: string | null;
    equipmentId?: string | null;
    vehicleCheckOutLogId?: string | null;
    vehicleCheckInLogId?: string | null;
  }
): Promise<boolean> {
  const user = await storage.getUser(userId);
  if (!user) return false;

  const isStaff = user.role === "admin" || user.role === "technician";
  if (isStaff) return true;

  if (upload.uploadedById === userId) return true;

  if (upload.requestId) {
    if (await canAccessServiceRequest(userId, upload.requestId)) return true;
  }

  if (upload.taskId) {
    if (await canAccessTask(userId, upload.taskId)) return true;
  }

  if (upload.equipmentId) {
    return false;
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

async function resolveObjectUrl(body: Record<string, unknown>): Promise<string> {
  let objectUrl = body.objectUrl as string;
  if (
    body.objectPath &&
    (!objectUrl.startsWith("http") || objectUrl.includes("mock-storage.local"))
  ) {
    try {
      const { getDownloadUrl, getBucketId } = await import("./objectStorage");
      if (getBucketId()) {
        objectUrl = await getDownloadUrl(body.objectPath as string);
      }
    } catch {
      // keep original url
    }
  }
  return objectUrl;
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
  const uploadData = insertUploadSchema.parse({
    ...body,
    objectUrl,
    uploadedById: userId,
  });
  const upload = await storage.createUpload(uploadData);
  return { upload };
}

export function sendUploadAuthError(res: Response, error: { status: number; message: string; errors?: unknown }) {
  return res.status(error.status).json(
    error.errors ? { message: error.message, errors: error.errors } : { message: error.message }
  );
}
