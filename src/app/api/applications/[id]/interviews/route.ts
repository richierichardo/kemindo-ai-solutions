import { NextResponse } from "next/server";
import { apiError, roleUser } from "@/lib/recruitment/api";
import { createInterview } from "@/lib/recruitment/interviews";
import { interviewScheduleSchema } from "@/lib/recruitment/validation";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await roleUser("company_hr");
    const parsed = interviewScheduleSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Interview schedule is invalid.", fieldErrors: parsed.error.flatten().fieldErrors } }, { status: 422 });
    return NextResponse.json({ data: await createInterview(user, (await context.params).id, parsed.data.interviewerId, new Date(parsed.data.scheduledAt)) }, { status: 201 });
  } catch (error) { return apiError(error); }
}
