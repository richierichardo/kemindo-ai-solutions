import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { applications, candidateDocuments, candidates } from "@/db/schema";
import { ApiError } from "@/lib/recruitment/api";
import { removePrivateStorageFile, writeCandidatePdf } from "@/lib/files/secure-storage";
import { getDb } from "@/lib/db";

export type CandidateIntakeInput = {
  vacancyId: string;
  fullName: string;
  email: string;
  phone: string | null;
  location: string | null;
  originalFilename: string;
  mimeType: string;
  bytes: Buffer;
  sha256: string;
};

export async function createCandidateApplication(input: CandidateIntakeInput) {
  const db = getDb();
  let storedPath: string | null = null;
  const candidateId = randomUUID();
  const documentId = randomUUID();

  try {
    const result = await db.transaction(async (tx) => {
      const existingDocument = await tx.select({ id: candidateDocuments.id }).from(candidateDocuments)
        .where(eq(candidateDocuments.sha256, input.sha256)).limit(1);
      if (existingDocument[0]) throw new ApiError(409, "DUPLICATE_FILE", "This CV file has already been uploaded.");

      const existingCandidate = await tx.select().from(candidates)
        .where(eq(candidates.email, input.email)).limit(1).then((rows) => rows[0]);
      const candidate = existingCandidate
        ? await tx.update(candidates).set({ fullName: input.fullName, phone: input.phone, location: input.location, updatedAt: new Date() })
          .where(eq(candidates.id, existingCandidate.id)).returning().then((rows) => rows[0])
        : await tx.insert(candidates).values({ id: candidateId, fullName: input.fullName, email: input.email, phone: input.phone, location: input.location, source: "manual_upload" }).returning().then((rows) => rows[0]);
      if (!candidate) throw new Error("Unable to create candidate.");

      const existingApplication = await tx.select({ id: applications.id }).from(applications)
        .where(and(eq(applications.vacancyId, input.vacancyId), eq(applications.candidateId, candidate.id))).limit(1);
      if (existingApplication[0]) throw new ApiError(409, "DUPLICATE_APPLICATION", "This candidate already has an application for the selected vacancy.");

      storedPath = await writeCandidatePdf(candidate.id, documentId, input.bytes);
      const document = await tx.insert(candidateDocuments).values({
        id: documentId, candidateId: candidate.id, documentType: "cv", originalFilename: input.originalFilename,
        localPath: storedPath, mimeType: input.mimeType, sha256: input.sha256,
      }).returning().then((rows) => rows[0]);
      const application = await tx.insert(applications).values({ vacancyId: input.vacancyId, candidateId: candidate.id }).returning().then((rows) => rows[0]);
      if (!document || !application) throw new Error("Unable to create candidate application.");
      return { candidate, document, application, candidateWasCreated: !existingCandidate };
    });
    return result;
  } catch (error) {
    if (storedPath) await removePrivateStorageFile(storedPath).catch(() => undefined);
    throw error;
  }
}
