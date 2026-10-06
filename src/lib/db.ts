import { Pool } from "pg";
import { getServerEnv } from "@/lib/env";

declare global {
  var kemindoDbPool: Pool | undefined;
}

export function getDb(): Pool {
  if (!globalThis.kemindoDbPool) {
    globalThis.kemindoDbPool = new Pool({ connectionString: getServerEnv().DATABASE_URL });
  }

  return globalThis.kemindoDbPool;
}

export async function checkDatabase(): Promise<{ connected: boolean; vectorExtension: boolean }> {
  const result = await getDb().query<{ connected: number; vector_extension: string | null }>(
    "SELECT 1 AS connected, (SELECT extname FROM pg_extension WHERE extname = 'vector') AS vector_extension",
  );
  const row = result.rows[0];

  return {
    connected: row?.connected === 1,
    vectorExtension: row?.vector_extension === "vector",
  };
}
