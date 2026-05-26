import { db } from "./db";
import { sql } from "drizzle-orm";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const SKIPPED_MIGRATIONS = new Map<string, string>([
  ["020_remove_uploads_table.sql", "legacy destructive migration that drops uploads"],
  ["030_force_fuel_level_fix.sql", "legacy destructive migration that drops fuel_level data"],
]);

function getMigrationsDir() {
  return join(import.meta.dirname, "migrations");
}

function getMigrationVersion(file: string) {
  return parseInt(file.split("_")[0], 10);
}

function sortMigrationFiles(a: string, b: string) {
  // 019 adds columns to uploads, so the uploads table must exist first.
  if (a === "021_create_uploads_table.sql" && b === "019_add_vehicle_upload_columns.sql") return -1;
  if (a === "019_add_vehicle_upload_columns.sql" && b === "021_create_uploads_table.sql") return 1;
  return getMigrationVersion(a) - getMigrationVersion(b) || a.localeCompare(b);
}

function getMigrations() {
  return readdirSync(getMigrationsDir())
    .filter((file) => file.endsWith(".sql"))
    .filter((file) => {
      const reason = SKIPPED_MIGRATIONS.get(file);
      if (reason) {
        console.warn(`Skipping migration ${file}: ${reason}`);
        return false;
      }
      return true;
    })
    .sort(sortMigrationFiles)
    .map((file) => ({
      file,
      name: file.replace(/\.sql$/, ""),
    }));
}

export async function applyInventoryTriggers() {
  try {
    console.log("Applying inventory triggers migration...");

    // In production, migrations are copied to dist/migrations
    // In development, they're in server/migrations
    const migrationPath = join(getMigrationsDir(), "001_inventory_triggers.sql");

    const migrationSQL = readFileSync(migrationPath, "utf-8");

    await db.execute(sql.raw(migrationSQL));
    console.log("✓ Inventory triggers migration applied successfully");
  } catch (error) {
    console.error("Error applying inventory triggers migration:", error);
    // Don't throw - migrations might already be applied
  }
}

export async function applyMigrations() {
  const migrations = getMigrations();

  try {
    // Create migrations tracking table if it doesn't exist (PostgreSQL)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("Checking for pending migrations...");

    for (const migration of migrations) {
      const version = parseInt(migration.name.split('_')[0]);

      // Check if migration was already applied
      const result = await db.execute(sql`
        SELECT version FROM schema_migrations WHERE version = ${version}
      `);

      if (!result.rows || result.rows.length === 0) {
        console.log(`Applying migration: ${migration.name}...`);
        try {
          const migrationSQL = readFileSync(
            join(getMigrationsDir(), migration.file),
            "utf-8"
          );
          await db.execute(sql.raw(migrationSQL));
          await db.execute(sql`
            INSERT INTO schema_migrations (version) VALUES (${version})
          `);
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