import { NextResponse } from "next/server";
import { apiError, roleUser } from "@/lib/recruitment/api";
import { makeHiringDecision } from "@/lib/recruitment/interviews";
import { decisionSchema } from "@/lib/recruitment/validation";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const parsed = decisionSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Decision is invalid.", fieldErrors: parsed.error.flatten().fieldErrors } }, { status: 422 }); return NextResponse.json({ data: await makeHiringDecision(await roleUser("hiring_manager"), (await context.params).id, parsed.data.decision, parsed.data.note) }); } catch (error) { return apiError(error); }
}
