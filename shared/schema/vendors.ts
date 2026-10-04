import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const VENDOR_TRADES = [
  { slug: "plumbing", label: "Plumbing" },
  { slug: "electrical", label: "Electrical" },
  { slug: "hvac", label: "HVAC" },
  { slug: "roofing", label: "Roofing" },
  { slug: "carpentry", label: "Carpentry" },
  { slug: "painting", label: "Painting" },
  { slug: "flooring", label: "Flooring" },
  { slug: "glass", label: "Glass / Windows" },
  { slug: "appliances", label: "Appliances" },
  { slug: "grounds", label: "Grounds / Landscaping" },
  { slug: "pest_control", label: "Pest Control" },
  { slug: "janitorial", label: "Janitorial" },
  { slug: "locksmith", label: "Locksmith" },
  { slug: "fire_protection", label: "Fire Protection" },
  { slug: "water_treatment", label: "Water Treatment" },
  { slug: "septic", label: "Septic / Sewer" },
  { slug: "mechanical", label: "Mechanical / Fleet" },
  { slug: "structural", label: "Structural" },
  { slug: "general", label: "General" },
] as const;

export type VendorTradeSlug = (typeof VENDOR_TRADES)[number]["slug"];

const vendorTradeSlugs = VENDOR_TRADES.map((trade) => trade.slug) as [
  VendorTradeSlug,
  ...VendorTradeSlug[],
];

export const vendorTradeSlugSchema = z.enum(vendorTradeSlugs);

export function vendorTradeLabel(slug: string): string {
  return VENDOR_TRADES.find((trade) => trade.slug === slug)?.label ?? slug;
}

export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 200 }),
  phoneNumber: varchar("phone_number", { length: 20 }),
  address: text("address"),
  contactPerson: varchar("contact_person", { length: 200 }),
  notes: text("notes"),
  trades: text("trades").array().notNull().default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertVendorSchema = createInsertSchema(vendors)
  .omit({ id: true, createdAt: true, updatedAt: true, trades: true })
  .extend({
    trades: z.array(vendorTradeSlugSchema).optional(),
  });
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendors.$inferSelect;
