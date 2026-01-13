import { db } from "./db";
import { sql } from "drizzle-orm";
import { readFileSync } from "fs";
import { join } from "path";

export async function applyInventoryTriggers() {
  try {
    console.log("Applying inventory triggers migration...");

    // In production, migrations are copied to dist/migrations
    // In development, they're in server/migrations
    const migrationPath = process.env.NODE_ENV === 'production'
      ? join(import.meta.dirname, "migrations", "001_inventory_triggers.sql")
      : join(import.meta.dirname, "migrations", "001_inventory_triggers.sql");

    const migrationSQL = readFileSync(migrationPath, "utf-8");

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
    { file: "006_add_read_to_messages.sql", name: "006_add_read_to_messages" },
    { file: "007_add_properties_and_equipment.sql", name: "007_add_properties_and_equipment" },
    { file: "008_fix_property_image_url.sql", name: "008_fix_property_image_url" },
    { file: "009_ensure_snake_case_columns.sql", name: "009_ensure_snake_case_columns" },
    { file: "010_add_missing_property_columns.sql", name: "010_add_missing_property_columns" },
    { file: "011_add_property_to_service_requests.sql", name: "011_add_property_to_service_requests" },
    { file: "012_add_equipment_id_to_tasks.sql", name: "012_add_equipment_id_to_tasks" },
    { file: "013_add_recurring_parameters.sql", name: "013_add_recurring_parameters" },
    { file: "014_add_contact_information_to_tasks.sql", name: "014_add_contact_information_to_tasks" },
    { file: "015_add_key_location_to_reservations.sql", name: "015_add_key_location_to_reservations" },
    { file: "016_add_passenger_count_to_reservations.sql", name: "016_add_passenger_count_to_reservations" },
    { file: "017_add_reservation_handoff_details.sql", name: "017_add_reservation_handoff_details" },
    { file: "018_add_last_viewed_status_to_reservations.sql", name: "018_add_last_viewed_status_to_reservations" },
    { file: "021_create_uploads_table.sql", name: "021_create_uploads_table" },
    { file: "031_fix_checkout_columns.sql", name: "031_fix_checkout_columns" },
    { file: "032_fix_uploads_constraint.sql", name: "032_fix_uploads_constraint" },
    { file: "033_add_checklist_groups.sql", name: "033_add_checklist_groups" },
  ];

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
            join(import.meta.dirname, "migrations", migration.file),
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