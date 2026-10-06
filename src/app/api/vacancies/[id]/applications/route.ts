import { NextResponse } from "next/server";
import { candidateIntakeSchema } from "@/lib/recruitment/validation";
import { ApiError, apiError, assertCompanyScope, audit, getRequisition, getVacancy, roleUser } from "@/lib/recruitment/api";
import { createCandidateApplication } from "@/lib/recruitment/candidate-intake";
import { inspectPdf } from "@/lib/files/secure-storage";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  let actor: Awaited<ReturnType<typeof roleUser>> | undefined;
  let vacancyId = "unknown";
  try {
    const user = await roleUser("company_hr");
    actor = user;
    vacancyId = (await context.params).id;
    const vacancy = await getVacancy(vacancyId);
    if (!vacancy) throw new ApiError(404, "NOT_FOUND", "Vacancy not found.");
    const requisition = await getRequisition(vacancy.requisitionId);
    if (!requisition) throw new ApiError(404, "NOT_FOUND", "Vacancy requisition not found.");
    assertCompanyScope(user, requisition.companyId, requisition.siteId);
    if (vacancy.status !== "published") throw new ApiError(409, "VACANCY_NOT_PUBLISHED", "Applications can only be added to published vacancies.");

    const form = await request.formData();
    const parsed = candidateIntakeSchema.safeParse({
      fullName: form.get("fullName"), email: form.get("email"), phone: form.get("phone") ?? "", location: form.get("location") ?? "",
    });
    if (!parsed.success) throw new ApiError(422, "VALIDATION_ERROR", "Candidate input is invalid.", parsed.error.flatten().fieldErrors);
    const file = form.get("cv");
    if (!(file instanceof File)) throw new ApiError(422, "VALIDATION_ERROR", "A CV PDF is required.", { cv: ["Upload a PDF CV."] });
    const inspected = await inspectPdf(file);
    const result = await createCandidateApplication({
      vacancyId, fullName: parsed.data.fullName, email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone || null, location: parsed.data.location || null,
      originalFilename: inspected.originalFilename, mimeType: file.type, bytes: inspected.bytes, sha256: inspected.sha256,
    });
    await audit(user.id, user.companyId, "candidate", result.candidate.id, result.candidateWasCreated ? "created" : "reused", { vacancyId });
    await audit(user.id, user.companyId, "candidate_document", result.document.id, "uploaded", { candidateId: result.candidate.id });
    await audit(user.id, user.companyId, "application", result.application.id, "created", { vacancyId, candidateId: result.candidate.id });
    return NextResponse.json({ data: { candidate: result.candidate, document: { ...result.document, parsedText: undefined, parsedData: undefined }, application: result.application } }, { status: 201 });
  } catch (error) {
    if (actor) await audit(actor.id, actor.companyId, "candidate_document", vacancyId, "upload_rejected", { code: error instanceof ApiError ? error.code : "FILE_VALIDATION_ERROR" }).catch(() => undefined);
    return apiError(error);
  }
}
