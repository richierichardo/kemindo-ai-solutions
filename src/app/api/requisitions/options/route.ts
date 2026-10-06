import { NextResponse } from "next/server";
import { apiError, getRecruitmentOptions, recruitmentUser } from "@/lib/recruitment/api";

export async function GET() {
  try { return NextResponse.json({ data: await getRecruitmentOptions(await recruitmentUser()) }); } catch (error) { return apiError(error); }
}
