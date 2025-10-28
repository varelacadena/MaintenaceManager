import { db } from "./db";
import { sql } from "drizzle-orm";
import { readFileSync } from "fs";
import { join } from "path";

export async function applyInventoryTriggers() {
  try {
    console.log("Applying inventory triggers migration...");
    
    const migrationSQL = readFileSync(
      join(import.meta.dirname, "migrations", "001_inventory_triggers.sql"),
      "utf-8"
    );
    
    await db.execute(sql.raw(migrationSQL));
    console.log("✓ Inventory triggers migration applied successfully");
  } catch (error) {
    console.error("Error applying inventory triggers migration:", error);
    // Don't throw - migrations might already be applied
  }
}
