import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { jobRequisitions } from "@/db/schema";
import { apiError, assertCompanyScope, audit, getRequisition, roleUser } from "@/lib/recruitment/api";
import { transitionRequisition } from "@/lib/recruitment/workflow";
import { rejectionSchema } from "@/lib/recruitment/validation";
import { getDb } from "@/lib/db";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const user = await roleUser("hiring_manager"); const id = (await context.params).id; const current = await getRequisition(id); if (!current) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Requisition not found." } }, { status: 404 }); assertCompanyScope(user, current.companyId, current.siteId); const parsed = rejectionSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "A rejection reason is required.", fieldErrors: parsed.error.flatten().fieldErrors } }, { status: 422 }); const status = transitionRequisition(current.status, "reject"); const row = await getDb().update(jobRequisitions).set({ status, rejectedBy: user.id, rejectedAt: new Date(), rejectionReason: parsed.data.reason, updatedBy: user.id, updatedAt: new Date() }).where(eq(jobRequisitions.id, id)).returning().then((rows) => rows[0]); await audit(user.id, user.companyId, "job_requisition", id, "rejected", { status, reason: parsed.data.reason }); return NextResponse.json({ data: row }); } catch (error) { return apiError(error); }
}
