/**
 * Run with: npx tsx server/scripts/verifyPerformanceIndexes.ts
 * Requires DATABASE_URL and applied migration 064_add_performance_indexes.sql
 */
import "dotenv/config";
import { pool } from "../db";

const queries = [
  {
    name: "tasks by assignee and status",
    sql: `EXPLAIN ANALYZE SELECT * FROM tasks WHERE assigned_to_id = $1 AND task_status != 'completed' ORDER BY initial_date DESC LIMIT 50`,
    params: ["00000000-0000-0000-0000-000000000000"],
  },
  {
    name: "notifications unread count",
    sql: `EXPLAIN ANALYZE SELECT count(*) FROM notifications WHERE user_id = $1 AND is_read = false AND is_dismissed = false`,
    params: ["00000000-0000-0000-0000-000000000000"],
  },
  {
    name: "service requests recent",
    sql: `EXPLAIN ANALYZE SELECT * FROM service_requests ORDER BY created_at DESC LIMIT 5`,
    params: [],
  },
  {
    name: "vehicle reservations by user",
    sql: `EXPLAIN ANALYZE SELECT * FROM vehicle_reservations WHERE user_id = $1 ORDER BY start_date DESC LIMIT 25`,
    params: ["00000000-0000-0000-0000-000000000000"],
  },
];

async function main() {
  for (const query of queries) {
    console.log(`\n=== ${query.name} ===`);
    const result = await pool.query(query.sql, query.params);
    for (const row of result.rows) {
      console.log(row["QUERY PLAN"]);
    }
  }
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
