import { NextResponse } from "next/server";
import { getCandidateReadModels } from "@/lib/recruitment/candidates";
import { ApiError, apiError, roleUser } from "@/lib/recruitment/api";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await roleUser("company_hr", "hiring_manager");
    const row = (await getCandidateReadModels(user, (await context.params).id))[0];
    if (!row) throw new ApiError(404, "NOT_FOUND", "Candidate not found.");
    return NextResponse.json({ data: row });
  } catch (error) {
    return apiError(error);
  }
}
