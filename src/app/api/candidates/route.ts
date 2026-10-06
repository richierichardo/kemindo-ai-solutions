import { NextResponse } from "next/server";
import { getCandidateReadModels } from "@/lib/recruitment/candidates";
import { apiError, roleUser } from "@/lib/recruitment/api";

export async function GET() {
  try {
    const user = await roleUser("company_hr", "hiring_manager");
    return NextResponse.json({ data: await getCandidateReadModels(user) });
  } catch (error) {
    return apiError(error);
  }
}
