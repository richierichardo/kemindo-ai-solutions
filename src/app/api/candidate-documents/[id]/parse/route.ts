import { NextResponse } from "next/server";
import { apiError, audit, roleUser } from "@/lib/recruitment/api";
import { getAccessibleDocument, parseCandidateDocument } from "@/lib/recruitment/cv-service";

function publicResult(result: Awaited<ReturnType<typeof getAccessibleDocument>>) {
  return { document: result.visible.documents.find((document) => document.id === result.document.id), applications: result.visible.applications };
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await roleUser("company_hr", "hiring_manager");
    return NextResponse.json({ data: publicResult(await getAccessibleDocument(user, (await context.params).id)) });
  } catch (error) { return apiError(error); }
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await roleUser("company_hr");
    const documentId = (await context.params).id;
    const result = await parseCandidateDocument(user, documentId);
    await audit(user.id, user.companyId, "candidate_document", documentId, "parsed", { candidateId: result.candidate.id });
    return NextResponse.json({ data: publicResult(result) });
  } catch (error) {
    return apiError(error);
  }
}
