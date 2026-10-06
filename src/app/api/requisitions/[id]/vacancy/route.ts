import { NextResponse } from "next/server";
import { vacancies } from "@/db/schema";
import { apiError, assertCompanyScope, audit, getRequisition, roleUser } from "@/lib/recruitment/api";
import { getDb } from "@/lib/db";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { const user = await roleUser("company_hr"); const id = (await context.params).id; const requisition = await getRequisition(id); if (!requisition) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Requisition not found." } }, { status: 404 }); assertCompanyScope(user, requisition.companyId, requisition.siteId); if (requisition.status !== "approved") return NextResponse.json({ error: { code: "INVALID_STATE_TRANSITION", message: "Only approved requisitions can create a vacancy." } }, { status: 409 }); const row = await getDb().insert(vacancies).values({ requisitionId: id, title: requisition.title, description: `${requisition.title} — ${requisition.requiredSkills.join(", ")}`, status: "draft", createdBy: user.id, updatedBy: user.id }).returning().then((rows) => rows[0]); await audit(user.id, user.companyId, "vacancy", row.id, "created", { requisitionId: id }); return NextResponse.json({ data: row }, { status: 201 }); } catch (error) { return apiError(error); }
}
