import { NextResponse } from "next/server";
import { apiError, roleUser } from "@/lib/recruitment/api";
import { matchingRequestSchema } from "@/lib/recruitment/validation";
import { generateMatching, getMatchingResult } from "@/lib/recruitment/matching";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { const user = await roleUser("company_hr", "hiring_manager"); return NextResponse.json({ data: await getMatchingResult(user, (await context.params).id) }); } catch (error) { return apiError(error); }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await roleUser("company_hr");
    const body = await request.json().catch(() => ({}));
    const parsed = matchingRequestSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Matching request is invalid." } }, { status: 422 });
    return NextResponse.json({ data: await generateMatching(user, (await context.params).id, parsed.data.force) });
  } catch (error) { return apiError(error); }
}
