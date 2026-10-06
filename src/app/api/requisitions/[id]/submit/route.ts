import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { jobRequisitions } from "@/db/schema";
import { apiError, assertCompanyScope, audit, getRequisition, roleUser } from "@/lib/recruitment/api";
import { transitionRequisition } from "@/lib/recruitment/workflow";
import { getDb } from "@/lib/db";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { const user = await roleUser("company_hr"); const id = (await context.params).id; const current = await getRequisition(id); if (!current) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Requisition not found." } }, { status: 404 }); assertCompanyScope(user, current.companyId, current.siteId); const status = transitionRequisition(current.status, "submit"); const row = await getDb().update(jobRequisitions).set({ status, submittedAt: new Date(), updatedBy: user.id, updatedAt: new Date() }).where(eq(jobRequisitions.id, id)).returning().then((rows) => rows[0]); await audit(user.id, user.companyId, "job_requisition", id, "submitted", { status }); return NextResponse.json({ data: row }); } catch (error) { return apiError(error); }
}
