import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { vacancies } from "@/db/schema";
import { apiError, assertCompanyScope, audit, getRequisition, getVacancy, roleUser } from "@/lib/recruitment/api";
import { transitionVacancy } from "@/lib/recruitment/workflow";
import { getDb } from "@/lib/db";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { const user = await roleUser("company_hr", "hiring_manager"); const id = (await context.params).id; const current = await getVacancy(id); if (!current) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Vacancy not found." } }, { status: 404 }); const requisition = await getRequisition(current.requisitionId); if (!requisition) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Requisition not found." } }, { status: 404 }); assertCompanyScope(user, requisition.companyId, requisition.siteId); const status = transitionVacancy(current.status, "close"); const row = await getDb().update(vacancies).set({ status, closedAt: new Date(), updatedBy: user.id, updatedAt: new Date() }).where(eq(vacancies.id, id)).returning().then((rows) => rows[0]); await audit(user.id, user.companyId, "vacancy", id, "closed", { status }); return NextResponse.json({ data: row }); } catch (error) { return apiError(error); }
}
