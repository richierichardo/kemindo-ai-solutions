import { NextResponse } from "next/server";
import { apiError, roleUser } from "@/lib/recruitment/api";
import { baseInterviewForApi, generateSummary } from "@/lib/recruitment/interviews";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { const data = await baseInterviewForApi(await roleUser("company_hr", "hiring_manager", "interviewer"), (await context.params).id); return NextResponse.json({ data: { summary: data.interview.aiSummary, error: data.interview.summaryError, generatedAt: data.interview.summaryGeneratedAt } }); } catch (error) { return apiError(error); }
}
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const body = await request.json().catch(() => ({})); return NextResponse.json({ data: await generateSummary(await roleUser("company_hr", "hiring_manager"), (await context.params).id, Boolean(body.force)) }); } catch (error) { return apiError(error); }
}
