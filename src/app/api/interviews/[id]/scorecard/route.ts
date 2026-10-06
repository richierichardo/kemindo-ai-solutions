import { NextResponse } from "next/server";
import { apiError, roleUser } from "@/lib/recruitment/api";
import { saveScorecard } from "@/lib/recruitment/interviews";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { return NextResponse.json({ data: await saveScorecard(await roleUser("interviewer"), (await context.params).id, await request.json().catch(() => null)) }); } catch (error) { return apiError(error); }
}
