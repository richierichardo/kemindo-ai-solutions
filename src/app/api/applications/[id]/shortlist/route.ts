import { NextResponse } from "next/server";
import { apiError, roleUser } from "@/lib/recruitment/api";
import { reviewApplication } from "@/lib/recruitment/matching";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { const user = await roleUser("company_hr"); return NextResponse.json({ data: await reviewApplication(user, (await context.params).id, "shortlist") }); } catch (error) { return apiError(error); }
}
