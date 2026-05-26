import type { Response } from "express";
import { FacilityValidationError } from "./facilityValidation";
import { handleRouteError } from "./routeUtils";

export function handleFacilityRouteError(res: Response, error: unknown, fallback: string) {
  if (error instanceof FacilityValidationError) {
    return res.status(error.status).json({ message: error.message });
  }
  return handleRouteError(res, error, fallback);
}
