import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Standard PostgreSQL pool (TCP). DATABASE_URL is a normal libpq-style connection string.
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: true,
});

// Handle pool errors gracefully
pool.on("error", (err) => {
  console.error("Database pool error:", err.message);
  // Don't crash the application on pool errors
});

// Handle connection errors
pool.on("connect", (client) => {
  client.on("error", (err) => {
    console.error("Database client error:", err.message);
  });
});

export const db = drizzle(pool, { schema });
