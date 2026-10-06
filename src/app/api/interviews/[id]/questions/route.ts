import { NextResponse } from "next/server";
import { apiError, roleUser } from "@/lib/recruitment/api";
import { baseInterviewForApi, generateQuestions } from "@/lib/recruitment/interviews";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { const user = await roleUser("company_hr", "hiring_manager", "interviewer"); const data = await baseInterviewForApi(user, (await context.params).id); return NextResponse.json({ data: { questions: data.interview.questions, error: data.interview.questionsError, generatedAt: data.interview.questionsGeneratedAt } }); } catch (error) { return apiError(error); }
}
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const body = await request.json().catch(() => ({})); return NextResponse.json({ data: await generateQuestions(await roleUser("company_hr"), (await context.params).id, Boolean(body.force)) }); } catch (error) { return apiError(error); }
}
