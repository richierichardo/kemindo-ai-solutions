import { config as loadEnv } from "dotenv";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb } from "../src/lib/db";

loadEnv({ path: ".env.local" });
loadEnv();

async function main() {
  await migrate(getDb(), { migrationsFolder: "./src/db/migrations" });
  console.log("Database migrations applied successfully.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
