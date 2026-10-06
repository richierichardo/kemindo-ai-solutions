import { config as loadEnv } from "dotenv";
import { checkDatabase } from "../src/lib/db";

loadEnv({ path: ".env.local" });
loadEnv();

async function main() {
  try {
    const status = await checkDatabase();
    if (!status.connected || !status.vectorExtension || !status.pgcryptoExtension || !status.migrationTable) {
      throw new Error(`Database is not ready: ${JSON.stringify(status)}`);
    }

    console.log(`Database is healthy; pgvector extension is enabled.`);
  } catch (error) {
    if (error && typeof error === "object") {
      const databaseError = error as { message?: string; code?: string; detail?: string; hint?: string; cause?: { message?: string; code?: string } };
      console.error(JSON.stringify({ message: databaseError.message, code: databaseError.code, detail: databaseError.detail, hint: databaseError.hint, cause: databaseError.cause }, null, 2));
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  }
}

void main();
