import { z } from "zod";
import { driverStatusValues, penaltyReasonValues } from "./schema/drivers";

export function normalizePersonName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function driverFullName(driver: { firstName: string; lastName: string }): string {
  return `${driver.firstName} ${driver.lastName}`.replace(/\s+/g, " ").trim();
}

export function driverHasContact(driver: { email?: string | null; phone?: string | null }): boolean {
  return Boolean(driver.email?.trim() || driver.phone?.trim());
}

export function driverCanBeSelected(
  driver: { status: string; email?: string | null; phone?: string | null },
  hasActivePenalty: boolean,
): boolean {
  return driver.status === "active" && !hasActivePenalty && driverHasContact(driver);
}

export const approvedDriverInputSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  department: z.string().trim().max(120).optional().nullable(),
  email: z.string().trim().email().max(200).optional().nullable().or(z.literal("")),
  phone: z.string().trim().max(30).optional().nullable(),
  status: z.enum(driverStatusValues).default("active"),
  notes: z.string().trim().max(2000).optional().nullable(),
}).superRefine((value, ctx) => {
  const email = value.email?.trim() || "";
  const phone = value.phone?.trim() || "";
  if (!email && !phone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Add an email or a phone number",
      path: ["email"],
    });
  }
});

export const driverImportSchema = z.object({
  drivers: z.array(approvedDriverInputSchema).min(1).max(500),
});

export const penaltyInputSchema = z.object({
  reason: z.enum(penaltyReasonValues),
  note: z.string().trim().max(2000).optional().nullable(),
  reservationId: z.string().trim().min(1).optional().nullable(),
});

export const publicVehicleRequestSchema = z.object({
  driverId: z.string().trim().min(1),
  purpose: z.string().trim().min(1).max(200),
  passengerCount: z.coerce.number().int().min(1).max(20),
  notes: z.string().trim().max(2000).optional().nullable(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  website: z.string().optional(),
});

export function isPublicVehicleHoneypot(input: { website?: string }) {
  return Boolean(input.website?.trim());
}

export const TRIP_CODE_LENGTH = 6;
export const TRIP_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeTripCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}
