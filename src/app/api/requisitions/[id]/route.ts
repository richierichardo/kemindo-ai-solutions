import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { jobRequisitions } from "@/db/schema";
import { apiError, assertCompanyScope, assertOrgReferences, audit, getRequisition, roleUser } from "@/lib/recruitment/api";
import { requisitionInputSchema } from "@/lib/recruitment/validation";
import { getDb } from "@/lib/db";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try { const user = await roleUser("company_hr", "hiring_manager"); const row = await getRequisition((await context.params).id); if (!row) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Requisition not found." } }, { status: 404 }); assertCompanyScope(user, row.companyId, row.siteId); return NextResponse.json({ data: row }); } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await roleUser("company_hr"); const id = (await context.params).id; const current = await getRequisition(id);
    if (!current) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Requisition not found." } }, { status: 404 });
    assertCompanyScope(user, current.companyId, current.siteId);
    if (!["draft", "rejected"].includes(current.status)) return NextResponse.json({ error: { code: "INVALID_STATE_TRANSITION", message: "Only draft or rejected requisitions can be edited." } }, { status: 409 });
    const parsed = requisitionInputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Requisition input is invalid.", fieldErrors: parsed.error.flatten().fieldErrors } }, { status: 422 });
    await assertOrgReferences(parsed.data, user);
    const row = await getDb().update(jobRequisitions).set({ ...parsed.data, status: current.status === "rejected" ? "draft" : current.status, updatedBy: user.id, rejectionReason: null, rejectedBy: null, rejectedAt: null, updatedAt: new Date() }).where(and(eq(jobRequisitions.id, id), eq(jobRequisitions.companyId, user.companyId ?? current.companyId))).returning().then((rows) => rows[0]);
    await audit(user.id, user.companyId, "job_requisition", id, "updated");
    return NextResponse.json({ data: row });
  } catch (error) { return apiError(error); }
}
