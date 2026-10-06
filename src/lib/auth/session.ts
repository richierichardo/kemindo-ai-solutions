import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getServerEnv } from "../env";

export const SESSION_COOKIE = "kemindo_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

type SessionPayload = { sub: string; iat: number; exp: number };

function sign(value: string): string {
  return createHmac("sha256", getServerEnv().AUTH_SESSION_SECRET).update(value).digest("base64url");
}

export function createSessionValue(userId: string, now = Math.floor(Date.now() / 1000)): string {
  const payload: SessionPayload = { sub: userId, iat: now, exp: now + SESSION_TTL_SECONDS };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function readSessionValue(value: string | undefined, now = Math.floor(Date.now() / 1000)): string | null {
  if (!value) return null;
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const validSignature = expected.length === signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  if (!validSignature) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    return payload.sub && payload.exp > now ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionValue(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: getServerEnv().APP_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: getServerEnv().APP_ENV === "production", path: "/", maxAge: 0 });
}

export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  return readSessionValue(cookieStore.get(SESSION_COOKIE)?.value);
}
