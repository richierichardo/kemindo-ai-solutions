import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { auditLogs, companies, divisions, jobFamilies, jobRequisitions, sites, vacancies } from "@/db/schema";
import { requireRecruitmentAccess, requireRole, type AuthUser } from "@/lib/auth/user";
import { WorkflowConflictError } from "@/lib/recruitment/workflow";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fieldErrors?: Record<string, string[]>) { super(message); }
}

export async function recruitmentUser(): Promise<AuthUser> {
  try { return await requireRecruitmentAccess(); } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") throw new ApiError(403, "FORBIDDEN", "Your role cannot access recruitment workflow.");
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required.");
  }
}

export async function roleUser(...roles: ("company_hr" | "interviewer" | "hiring_manager")[]): Promise<AuthUser> {
  try { return await requireRole(...roles); } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") throw new ApiError(403, "FORBIDDEN", "Your role cannot perform this action.");
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required.");
  }
}

export function apiError(error: unknown) {
  if (error instanceof ApiError) return Response.json({ error: { code: error.code, message: error.message, ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}) } }, { status: error.status });
  if (error instanceof WorkflowConflictError) return Response.json({ error: { code: error.code, message: error.message } }, { status: 409 });
  return Response.json({ error: { code: "INTERNAL_ERROR", message: "Unexpected recruitment workflow error." } }, { status: 500 });
}

export async function audit(userId: string, companyId: string | null, entityType: string, entityId: string, action: string, afterData?: Record<string, unknown>) {
  await getDb().insert(auditLogs).values({ actorId: userId, companyId, entityType, entityId, action, afterData });
}

export async function getRecruitmentOptions(user: AuthUser) {
  const db = getDb();
  const [companyRows, divisionRows, siteRows, familyRows] = await Promise.all([
    user.companyId ? db.select().from(companies).where(eq(companies.id, user.companyId)) : db.select().from(companies),
    user.companyId ? db.select().from(divisions).where(eq(divisions.companyId, user.companyId)) : db.select().from(divisions),
    user.companyId ? db.select().from(sites).where(eq(sites.companyId, user.companyId)) : db.select().from(sites),
    db.select().from(jobFamilies),
  ]);
  return { companies: companyRows, divisions: divisionRows, sites: siteRows, jobFamilies: familyRows };
}

export function assertCompanyScope(user: AuthUser, companyId: string, siteId?: string | null) {
  if (user.companyId && user.companyId !== companyId) throw new ApiError(404, "NOT_FOUND", "Recruitment record not found.");
  if (siteId && user.siteId && user.siteId !== siteId) throw new ApiError(404, "NOT_FOUND", "Recruitment record not found.");
}

export async function assertOrgReferences(input: { companyId: string; divisionId: string; siteId: string | null; jobFamilyId: string }, user: AuthUser) {
  assertCompanyScope(user, input.companyId, input.siteId);
  const db = getDb();
  const [division, site, family] = await Promise.all([
    db.select({ id: divisions.id }).from(divisions).where(and(eq(divisions.id, input.divisionId), eq(divisions.companyId, input.companyId))).limit(1),
    input.siteId ? db.select({ id: sites.id }).from(sites).where(and(eq(sites.id, input.siteId), eq(sites.companyId, input.companyId))).limit(1) : Promise.resolve([{ id: null }]),
    db.select({ id: jobFamilies.id }).from(jobFamilies).where(eq(jobFamilies.id, input.jobFamilyId)).limit(1),
  ]);
  if (!division[0] || (input.siteId && !site[0]) || !family[0]) throw new ApiError(422, "INVALID_ORGANISATION_REFERENCE", "Organisation or job family selection is invalid.");
}

export async function getRequisition(id: string) {
  return getDb().select().from(jobRequisitions).where(eq(jobRequisitions.id, id)).limit(1).then((rows) => rows[0]);
}

export async function getVacancy(id: string) {
  return getDb().select().from(vacancies).where(eq(vacancies.id, id)).limit(1).then((rows) => rows[0]);
}
