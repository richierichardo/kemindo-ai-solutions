import { NextResponse } from "next/server";
import { apiError, roleUser } from "@/lib/recruitment/api";
import { baseInterviewForApi } from "@/lib/recruitment/interviews";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { return NextResponse.json({ data: await baseInterviewForApi(await roleUser("company_hr", "hiring_manager", "interviewer"), (await context.params).id) }); } catch (error) { return apiError(error); }
}
