import { NextResponse } from "next/server";
import { checkDatabase } from "@/lib/db";
import { getServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const env = getServerEnv();
    const database = await checkDatabase();
    const healthy = database.connected && database.vectorExtension;

    return NextResponse.json(
      {
        status: healthy ? "ok" : "degraded",
        app: "kemindo-operations-platform",
        environment: env.APP_ENV,
        database,
      },
      { status: healthy ? 200 : 503 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown health check failure",
      },
      { status: 503 },
    );
  }
}
