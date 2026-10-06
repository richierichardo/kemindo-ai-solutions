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
  if (error && typeof error === "object") {
    const databaseError = error as { message?: string; code?: string; detail?: string; hint?: string; cause?: { message?: string; code?: string } };
    console.error(JSON.stringify({ message: databaseError.message, code: databaseError.code, detail: databaseError.detail, hint: databaseError.hint, cause: databaseError.cause }, null, 2));
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
