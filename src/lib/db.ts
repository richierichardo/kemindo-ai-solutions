import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import { getServerEnv } from "@/lib/env";
import * as schema from "@/db/schema";

const createPool = () => new Pool({ connectionString: getServerEnv().DATABASE_URL });
const createDatabase = () => drizzle(createPool(), { schema });

export type Database = ReturnType<typeof createDatabase>;

declare global {
  var kemindoDb: Database | undefined;
}

export function getDb(): Database {
  if (!globalThis.kemindoDb) {
    globalThis.kemindoDb = createDatabase();
  }

  return globalThis.kemindoDb;
}

export async function checkDatabase(): Promise<{
  connected: boolean;
  vectorExtension: boolean;
  pgcryptoExtension: boolean;
  migrationTable: boolean;
}> {
  const result = await getDb().execute(sql`
    SELECT
      1 AS connected,
      EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') AS vector_extension,
      EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') AS pgcrypto_extension,
      to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS migration_table
  `);
  const row = result.rows[0] as {
    connected: number;
    vector_extension: boolean;
    pgcrypto_extension: boolean;
    migration_table: boolean;
  } | undefined;

  return {
    connected: row?.connected === 1,
    vectorExtension: row?.vector_extension === true,
    pgcryptoExtension: row?.pgcrypto_extension === true,
    migrationTable: row?.migration_table === true,
  };
}
