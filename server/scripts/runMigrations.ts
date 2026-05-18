import { applyMigrations } from "../applyMigrations";

applyMigrations()
  .then(() => {
    console.log("Migrations complete");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
