import { NextResponse } from "next/server";
import { apiError, roleUser } from "@/lib/recruitment/api";
import { listInterviews } from "@/lib/recruitment/interviews";

export async function GET() {
  try { return NextResponse.json({ data: await listInterviews(await roleUser("company_hr", "hiring_manager", "interviewer")) }); } catch (error) { return apiError(error); }
}
