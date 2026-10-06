import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { jobRequisitions, vacancies } from "@/db/schema";
import { ApiError, apiError, assertOrgReferences, audit, roleUser } from "@/lib/recruitment/api";
import { requisitionInputSchema } from "@/lib/recruitment/validation";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const user = await roleUser("company_hr", "hiring_manager");
    const rows = user.companyId ? await getDb().select().from(jobRequisitions).where(eq(jobRequisitions.companyId, user.companyId)) : await getDb().select().from(jobRequisitions);
    const vacancyRows = await getDb().select().from(vacancies);
    return NextResponse.json({ data: rows.map((row) => ({ ...row, vacancies: vacancyRows.filter((vacancy) => vacancy.requisitionId === row.id) })) });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const user = await roleUser("company_hr");
    const body = await request.json().catch(() => null);
    const parsed = requisitionInputSchema.safeParse(body);
    if (!parsed.success) throw new ApiError(422, "VALIDATION_ERROR", "Requisition input is invalid.", parsed.error.flatten().fieldErrors);
    await assertOrgReferences(parsed.data, user);
    const row = await getDb().insert(jobRequisitions).values({ ...parsed.data, createdBy: user.id, updatedBy: user.id }).returning().then((rows) => rows[0]);
    if (!row) throw new Error("Unable to create requisition.");
    await audit(user.id, user.companyId, "job_requisition", row.id, "created");
    return NextResponse.json({ data: row }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
