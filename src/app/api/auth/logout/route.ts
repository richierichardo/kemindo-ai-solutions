import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";
import { getCurrentUser, recordAuthAudit } from "@/lib/auth/user";

export async function POST() {
  try {
    const user = await getCurrentUser();
    await clearSessionCookie();
    if (user) await recordAuthAudit("logout", user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    await clearSessionCookie();
    return NextResponse.json({ error: error instanceof Error ? error.message : "Logout failed." }, { status: 503 });
  }
}
