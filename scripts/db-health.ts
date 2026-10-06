import { checkDatabase } from "../src/lib/db";

async function main() {
  try {
    const status = await checkDatabase();
    if (!status.connected || !status.vectorExtension) {
      throw new Error(`Database is not ready: ${JSON.stringify(status)}`);
    }

    console.log(`Database is healthy; pgvector extension is enabled.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

void main();
