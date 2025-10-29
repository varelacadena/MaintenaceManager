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

export async function applyMigrations() {
  const migrations = [
    { file: "001_inventory_triggers.sql", name: "001_inventory_triggers" },
    { file: "002_nullable_request_id.sql", name: "002_nullable_request_id" },
    { file: "003_note_type.sql", name: "003_note_type" },
    { file: "004_fix_phone_number_column.sql", name: "004_fix_phone_number_column" },
    { file: "005_add_note_type_column.sql", name: "005_add_note_type_column" },
  ];

  try {
    // Create migrations tracking table if it doesn't exist (PostgreSQL)
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `));

    console.log("Checking for pending migrations...");

    for (const migration of migrations) {
      const version = parseInt(migration.name.split('_')[0]);

      // Check if migration was already applied
      const result = await db.execute(sql.raw(`
        SELECT version FROM schema_migrations WHERE version = ${version};
      `));

      if (!result || result.length === 0) {
        console.log(`Applying migration: ${migration.name}...`);
        try {
          const migrationSQL = readFileSync(
            join(import.meta.dirname, "migrations", migration.file),
            "utf-8"
          );
          await db.execute(sql.raw(migrationSQL));
          await db.execute(sql.raw(`
            INSERT INTO schema_migrations (version) VALUES (${version});
          `));
          console.log(`✓ Migration ${migration.name} applied successfully`);
        } catch (error) {
          console.error(`Error applying migration ${migration.name}:`, error);
          throw error;
        }
      } else {
        console.log(`Migration ${migration.name} already applied, skipping`);
      }
    }
    console.log("All migrations applied successfully.");
  } catch (error) {
    console.error("Error applying migrations:", error);
    throw error;
  }
}