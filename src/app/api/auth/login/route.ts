import { NextResponse } from "next/server";
import { z } from "zod";
import { setSessionCookie } from "@/lib/auth/session";
import { findAuthUserByEmail, getAuthUserById, recordAuthAudit } from "@/lib/auth/user";
import { verifyPassword } from "@/lib/auth/password";

const loginSchema = z.object({ email: z.string().email().max(320), password: z.string().min(1).max(256) });

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });

  try {
    const user = await findAuthUserByEmail(parsed.data.email);
    const valid = Boolean(user?.isActive && user && await verifyPassword(parsed.data.password, user.passwordHash));
    if (!valid || !user) {
      await recordAuthAudit("login_failed");
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    await setSessionCookie(user.id);
    await recordAuthAudit("login_succeeded", user.id);
    const authUser = await getAuthUserById(user.id);
    return NextResponse.json({ user: authUser });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Authentication service unavailable." }, { status: 503 });
  }
}
