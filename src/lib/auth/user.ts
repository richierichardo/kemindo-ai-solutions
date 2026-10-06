import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { auditLogs, roles, userRoles, users } from "@/db/schema";
import { getSessionUserId } from "@/lib/auth/session";
import type { RecruitmentRole } from "@/lib/auth/permissions";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  companyId: string | null;
  siteId: string | null;
  roles: RecruitmentRole[];
};

export async function findAuthUserByEmail(email: string) {
  return getDb().select().from(users).where(eq(users.email, email.toLowerCase())).limit(1).then((rows) => rows[0]);
}

export async function getAuthUserById(id: string): Promise<AuthUser | null> {
  const user = await getDb().select({ id: users.id, email: users.email, fullName: users.fullName, companyId: users.companyId, siteId: users.siteId })
    .from(users).where(eq(users.id, id)).limit(1).then((rows) => rows[0]);
  if (!user) return null;

  const assignedRoles = await getDb().select({ code: roles.code }).from(userRoles).innerJoin(roles, eq(userRoles.roleId, roles.id)).where(eq(userRoles.userId, id));
  return { ...user, roles: assignedRoles.map((role) => role.code).filter((role): role is RecruitmentRole => ["company_hr", "interviewer", "hiring_manager"].includes(role)) };
}

export async function recordAuthAudit(action: string, userId?: string, afterData?: Record<string, string>) {
  await getDb().insert(auditLogs).values({ actorId: userId, action, entityType: "auth", afterData });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const userId = await getSessionUserId();
  return userId ? getAuthUserById(userId) : null;
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireRole(...requiredRoles: RecruitmentRole[]): Promise<AuthUser> {
  const user = await requireUser();
  if (!requiredRoles.some((role) => user.roles.includes(role))) throw new Error("FORBIDDEN");
  return user;
}

export async function requireRecruitmentAccess(): Promise<AuthUser> {
  return requireRole("company_hr", "interviewer", "hiring_manager");
}
