import { NextResponse } from "next/server";
import { roleUser, apiError, ApiError } from "@/lib/recruitment/api";
import { aiInterviewSchema, matchingChatSchema } from "@/lib/recruitment/validation";
import { generateMatching } from "@/lib/recruitment/matching";
import { generateQuestions, generateSummary } from "@/lib/recruitment/interviews";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (body?.feature === "candidate_match") {
      const user = await roleUser("company_hr");
      const parsed = matchingChatSchema.safeParse(body);
      if (!parsed.success) throw new ApiError(422, "VALIDATION_ERROR", "AI chat request is invalid.", parsed.error.flatten().fieldErrors);
      return NextResponse.json({ data: await generateMatching(user, parsed.data.applicationId, parsed.data.force) });
    }
    const parsed = aiInterviewSchema.safeParse(body);
    if (!parsed.success) throw new ApiError(422, "VALIDATION_ERROR", "AI chat request is invalid.", parsed.error.flatten().fieldErrors);
    const user = parsed.data.feature === "interview_questions" ? await roleUser("company_hr") : await roleUser("company_hr", "hiring_manager");
    return NextResponse.json({ data: parsed.data.feature === "interview_questions" ? await generateQuestions(user, parsed.data.interviewId, parsed.data.force) : await generateSummary(user, parsed.data.interviewId, parsed.data.force) });
  } catch (error) { return apiError(error); }
}
