const pg = require("pg");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    console.log("Done");
  } catch (err) {
    console.error(err.message);
  } finally {
    await pool.end();
  }
})();
