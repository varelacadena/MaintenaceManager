import type { Express } from "express";
import rateLimit from "express-rate-limit";
import { storage } from "../storage";
import { handleRouteError } from "../routeUtils";
import { handleFacilityRouteError } from "../routeFacilityError";
import { validateServiceRequestLocation } from "../facilityValidation";
import { notificationService, notifyNewServiceRequest } from "../notifications";
import { registerPublicRequestUpload } from "../uploadRegistration";
import {
  isPublicRequestHoneypot,
  publicServiceRequestSchema,
} from "@shared/publicServiceRequest";

const issuedPublicUploadPaths = new Map<string, number>();
const PUBLIC_UPLOAD_PATH_TTL_MS = 60 * 60 * 1000;

function rememberIssuedPublicPath(objectPath: string) {
  const now = Date.now();
  issuedPublicUploadPaths.set(objectPath, now + PUBLIC_UPLOAD_PATH_TTL_MS);
  if (issuedPublicUploadPaths.size > 5000) {
    for (const [path, expires] of issuedPublicUploadPaths) {
      if (expires < now) issuedPublicUploadPaths.delete(path);
    }
  }
}

function consumeIssuedPublicPath(objectPath: string): boolean {
  const expires = issuedPublicUploadPaths.get(objectPath);
  if (!expires || expires < Date.now()) {
    issuedPublicUploadPaths.delete(objectPath);
    return false;
  }
  issuedPublicUploadPaths.delete(objectPath);
  return true;
}

function sortByName<T extends { name: string }>(items: T[]) {
  return [...items].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}

function toPublicProperty(property: { id: string; name: string; type: string; address?: string | null }) {
  return {
    id: property.id,
    name: property.name,
    type: property.type,
    address: property.address ?? null,
  };
}

function toPublicSpace(space: { id: string; name: string; floor?: string | null; propertyId: string }) {
  return {
    id: space.id,
    name: space.name,
    floor: space.floor ?? null,
    propertyId: space.propertyId,
  };
}

export function registerPublicRequestRoutes(app: Express) {
  const reportLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many reports. Please try again later." },
  });

  const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many uploads. Please try again later." },
  });

  app.get("/api/public/properties", async (_req, res) => {
    try {
      const properties = await storage.getProperties();
      res.json(sortByName(properties).map(toPublicProperty));
    } catch (error) {
      handleRouteError(res, error, "Failed to load locations");
    }
  });

  app.get("/api/public/spaces", async (req, res) => {
    try {
      const propertyId = String(req.query.propertyId || "");
      if (!propertyId) {
        return res.status(400).json({ message: "propertyId is required" });
      }
      const property = await storage.getProperty(propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      if (property.type !== "building") {
        return res.json([]);
      }
      const spaces = await storage.getSpacesByProperty(propertyId);
      res.json(sortByName(spaces).map(toPublicSpace));
    } catch (error) {
      handleRouteError(res, error, "Failed to load rooms");
    }
  });

  app.post("/api/public/objects/upload", uploadLimiter, async (_req, res) => {
    try {
      const { getSignedUploadUrl } = await import("../objectStorage");
      const { uploadURL, objectPath } = await getSignedUploadUrl();
      rememberIssuedPublicPath(objectPath);
      res.json({
        uploadURL,
        objectPath,
        isMock: false,
      });
    } catch (error) {
      handleRouteError(res, error, "Failed to get upload URL");
    }
  });

  app.post("/api/public/service-requests", reportLimiter, async (req, res) => {
    try {
      const parsed = publicServiceRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Invalid input",
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const data = parsed.data;
      if (isPublicRequestHoneypot(data)) {
        return res.json({
          id: "ok",
          requestNumber: 0,
          title: data.title,
        });
      }

      await validateServiceRequestLocation({
        propertyId: data.propertyId,
        spaceId: data.spaceId,
      });

      for (const photo of data.photos) {
        const expires = issuedPublicUploadPaths.get(photo.objectPath);
        if (!expires || expires < Date.now()) {
          return res.status(400).json({
            message: "Photo upload expired or was not issued by this server. Please add the photo again.",
          });
        }
      }

      const request = await storage.createServiceRequest({
        title: data.title,
        description: data.description,
        urgency: data.urgency,
        propertyId: data.propertyId,
        spaceId: data.spaceId,
        category: "General",
        requesterId: null,
        requesterName: data.requesterName,
        requesterEmail: data.requesterEmail,
        requesterPhone: data.requesterPhone,
        requestedDate: new Date(),
      });

      for (const photo of data.photos) {
        consumeIssuedPublicPath(photo.objectPath);
      }

      let failedPhotos = 0;
      for (const photo of data.photos) {
        const result = await registerPublicRequestUpload(request.id, data.requesterName, photo);
        if (result.error) {
          failedPhotos += 1;
        }
      }

      const admins = await storage.getUsersByRoles(["admin"]);
      notifyNewServiceRequest(request, null, admins, notificationService).catch((err) =>
        console.error("Failed to send public service request notification emails:", err)
      );

      res.json({
        ...request,
        failedPhotos,
      });
    } catch (error) {
      handleFacilityRouteError(res, error, "Failed to submit report");
    }
  });
}
