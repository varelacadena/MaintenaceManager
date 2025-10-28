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
    { name: '001_inventory_triggers', file: '001_inventory_triggers.sql' },
    { name: '002_nullable_request_id', file: '002_nullable_request_id.sql' }
  ];

  try {
    const currentSchemaVersion = await db.execute(sql.raw("PRAGMA user_version;"));
    let schemaVersion = 0;

    if (currentSchemaVersion && Array.isArray(currentSchemaVersion) && currentSchemaVersion.length > 0) {
      schemaVersion = currentSchemaVersion[0].user_version;
    }

    console.log(`Current schema version: ${schemaVersion}`);

    for (const migration of migrations) {
      if (parseInt(migration.name.split('_')[0]) > schemaVersion) {
        console.log(`Applying migration: ${migration.name}...`);
        try {
          const migrationSQL = readFileSync(
            join(import.meta.dirname, "migrations", migration.file),
            "utf-8"
          );
          await db.execute(sql.raw(migrationSQL));
          await db.execute(sql.raw(`PRAGMA user_version = ${parseInt(migration.name.split('_')[0])};`));
          console.log(`✓ Migration ${migration.name} applied successfully`);
        } catch (error) {
          console.error(`Error applying migration ${migration.name}:`, error);
          // Re-throw the error to stop the migration process if a critical migration fails
          throw error;
        }
      }
    }
    console.log("All migrations applied successfully.");
  } catch (error) {
    console.error("Error applying migrations:", error);
    // Ensure we don't proceed if migrations fail
    throw error;
  }
}