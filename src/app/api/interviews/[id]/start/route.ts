import { NextResponse } from "next/server";
import { apiError, roleUser } from "@/lib/recruitment/api";
import { changeInterviewStatus } from "@/lib/recruitment/interviews";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { return NextResponse.json({ data: await changeInterviewStatus(await roleUser("interviewer"), (await context.params).id, "in_progress") }); } catch (error) { return apiError(error); }
}
