import { NextResponse } from "next/server";
import { getPublishedVacancies } from "@/lib/recruitment/candidates";
import { apiError, roleUser } from "@/lib/recruitment/api";

export async function GET() {
  try {
    const user = await roleUser("company_hr");
    return NextResponse.json({ data: { vacancies: await getPublishedVacancies(user) } });
  } catch (error) {
    return apiError(error);
  }
}
