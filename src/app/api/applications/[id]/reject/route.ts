import { NextResponse } from "next/server";
import { apiError, roleUser, ApiError } from "@/lib/recruitment/api";
import { reviewApplication } from "@/lib/recruitment/matching";
import { reviewNoteSchema } from "@/lib/recruitment/validation";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await roleUser("company_hr");
    const parsed = reviewNoteSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new ApiError(422, "VALIDATION_ERROR", "A review note is required.", parsed.error.flatten().fieldErrors);
    return NextResponse.json({ data: await reviewApplication(user, (await context.params).id, "reject", parsed.data.note) });
  } catch (error) { return apiError(error); }
}
