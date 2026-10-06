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
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

void main();
