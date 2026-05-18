/**
 * Verifies fleet-related DB objects exist. Run after migrations:
 *   npm run verify:fleet-db
 */
import { db } from "../db";
import { sql } from "drizzle-orm";

const REQUIRED: { table: string; columns: string[] }[] = [
  {
    table: "vehicles",
    columns: ["id", "make", "model", "vehicle_id", "status", "image_url"],
  },
  {
    table: "vehicle_reservations",
    columns: ["id", "vehicle_id", "user_id", "status", "start_date", "end_date"],
  },
  {
    table: "vehicle_maintenance_logs",
    columns: ["id", "vehicle_id", "maintenance_date", "type", "description"],
  },
];

async function columnExists(table: string, column: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${table}
      AND column_name = ${column}
    LIMIT 1
  `);
  return (result.rows?.length ?? 0) > 0;
}

async function tableExists(table: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ${table}
    LIMIT 1
  `);
  return (result.rows?.length ?? 0) > 0;
}

async function main() {
  let failed = false;

  for (const { table, columns } of REQUIRED) {
    if (!(await tableExists(table))) {
      console.error(`✗ Missing table: ${table}`);
      failed = true;
      continue;
    }
    console.log(`✓ Table ${table}`);

    for (const column of columns) {
      if (!(await columnExists(table, column))) {
        console.error(`  ✗ Missing column: ${table}.${column}`);
        failed = true;
      }
    }
  }

  const migration054 = await db.execute(sql`
    SELECT version FROM schema_migrations WHERE version = 54
  `);
  if ((migration054.rows?.length ?? 0) === 0) {
    console.warn("⚠ Migration 054 (vehicle image_url) not recorded — run npm run db:migrate or start the server");
  } else {
    console.log("✓ Migration 054 recorded");
  }

  const migration055 = await db.execute(sql`
    SELECT version FROM schema_migrations WHERE version = 55
  `);
  if ((migration055.rows?.length ?? 0) === 0) {
    console.warn("⚠ Migration 055 (vehicle_maintenance_logs) not recorded — run npm run db:migrate");
  } else {
    console.log("✓ Migration 055 recorded");
  }

  if (failed) {
    console.error("\nFleet schema verification FAILED");
    process.exit(1);
  }
  console.log("\nFleet schema verification passed");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
