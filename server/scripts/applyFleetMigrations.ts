/**
 * Applies fleet-only migrations (054, 055) when the full chain is blocked earlier.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { sql } from "drizzle-orm";
import { db } from "../db";

const FLEET_MIGRATIONS = [
  { version: 54, file: "054_add_vehicle_image_url.sql", name: "054_add_vehicle_image_url" },
  { version: 55, file: "055_create_vehicle_maintenance_logs.sql", name: "055_create_vehicle_maintenance_logs" },
];

async function main() {
  for (const migration of FLEET_MIGRATIONS) {
    const result = await db.execute(sql`
      SELECT version FROM schema_migrations WHERE version = ${migration.version}
    `);
    if (result.rows?.length) {
      console.log(`Skipping ${migration.name} (already applied)`);
      continue;
    }

    console.log(`Applying ${migration.name}...`);
    const sqlText = readFileSync(
      join(import.meta.dirname, "..", "migrations", migration.file),
      "utf-8",
    );
    await db.execute(sql.raw(sqlText));
    await db.execute(sql`
      INSERT INTO schema_migrations (version) VALUES (${migration.version})
    `);
    console.log(`✓ ${migration.name}`);
  }

  console.log("Fleet migrations complete");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
