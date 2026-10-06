import { NextResponse } from "next/server";
import { readPrivateStorageFile } from "@/lib/files/secure-storage";
import { getCandidateReadModels } from "@/lib/recruitment/candidates";
import { ApiError, apiError, roleUser } from "@/lib/recruitment/api";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await roleUser("company_hr", "hiring_manager");
    const documentId = (await context.params).id;
    const candidate = (await getCandidateReadModels(user)).find((row) => row.documents.some((document) => document.id === documentId));
    const document = candidate?.documents.find((item) => item.id === documentId);
    if (!candidate || !document) throw new ApiError(404, "NOT_FOUND", "Candidate document not found.");
    const bytes = await readPrivateStorageFile(document.localPath);
    return new NextResponse(new Uint8Array(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${document.originalFilename}"`, "Cache-Control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
