import { NextResponse } from "next/server";
import { roleUser, apiError, ApiError } from "@/lib/recruitment/api";
import { matchingChatSchema } from "@/lib/recruitment/validation";
import { generateMatching } from "@/lib/recruitment/matching";

export async function POST(request: Request) {
  try {
    const user = await roleUser("company_hr");
    const parsed = matchingChatSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new ApiError(422, "VALIDATION_ERROR", "AI chat request is invalid.", parsed.error.flatten().fieldErrors);
    return NextResponse.json({ data: await generateMatching(user, parsed.data.applicationId, parsed.data.force) });
  } catch (error) { return apiError(error); }
}
