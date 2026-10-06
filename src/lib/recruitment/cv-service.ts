import { and, eq, or } from "drizzle-orm";
import { candidateDocuments, candidates } from "@/db/schema";
import { getDb } from "@/lib/db";
import { readPrivateStorageFile } from "@/lib/files/secure-storage";
import { ApiError } from "@/lib/recruitment/api";
import { getCandidateReadModels } from "./candidates";
import { extractPdfText, parseCvText, CvParseError } from "./cv-parser";

export async function getAccessibleDocument(user: Parameters<typeof getCandidateReadModels>[0], documentId: string) {
  const visibleCandidates = await getCandidateReadModels(user);
  const visible = visibleCandidates.find((candidate) => candidate.documents.some((document) => document.id === documentId));
  if (!visible) throw new ApiError(404, "NOT_FOUND", "Candidate document not found.");
  const document = await getDb().select().from(candidateDocuments).where(and(eq(candidateDocuments.id, documentId), eq(candidateDocuments.candidateId, visible.id))).limit(1).then((rows) => rows[0]);
  if (!document) throw new ApiError(404, "NOT_FOUND", "Candidate document not found.");
  const candidate = await getDb().select().from(candidates).where(eq(candidates.id, visible.id)).limit(1).then((rows) => rows[0]);
  if (!candidate) throw new ApiError(404, "NOT_FOUND", "Candidate not found.");
  return { document, candidate, visible };
}

export async function parseCandidateDocument(user: Parameters<typeof getCandidateReadModels>[0], documentId: string) {
  const accessible = await getAccessibleDocument(user, documentId);
  const { document, candidate } = accessible;
  if (document.parseStatus === "completed") return accessible;
  if (document.parseStatus === "processing") throw new ApiError(409, "PARSE_IN_PROGRESS", "This CV is already being parsed.");

  const claimed = await getDb().update(candidateDocuments).set({ parseStatus: "processing", parseError: null, updatedAt: new Date() })
    .where(and(eq(candidateDocuments.id, documentId), or(eq(candidateDocuments.parseStatus, "pending"), eq(candidateDocuments.parseStatus, "failed")))).returning().then((rows) => rows[0]);
  if (!claimed) {
    const current = await getDb().select({ parseStatus: candidateDocuments.parseStatus }).from(candidateDocuments).where(eq(candidateDocuments.id, documentId)).limit(1).then((rows) => rows[0]);
    if (current?.parseStatus === "completed") return getAccessibleDocument(user, documentId);
    throw new ApiError(409, "PARSE_IN_PROGRESS", "This CV is already being parsed.");
  }

  try {
    const bytes = await readPrivateStorageFile(document.localPath);
    const parsedText = await extractPdfText(bytes);
    const parsedData = parseCvText(parsedText, candidate);
    await getDb().update(candidateDocuments).set({ parsedText, parsedData, parseStatus: "completed", parsedAt: new Date(), parseError: null, updatedAt: new Date() }).where(eq(candidateDocuments.id, documentId));
    return getAccessibleDocument(user, documentId);
  } catch (error) {
    const safeMessage = error instanceof CvParseError ? error.message : "The CV could not be parsed. Replace the file or retry parsing.";
    await getDb().update(candidateDocuments).set({ parseStatus: "failed", parseError: safeMessage, parsedAt: null, updatedAt: new Date() }).where(eq(candidateDocuments.id, documentId));
    if (error instanceof CvParseError) throw new ApiError(422, "CV_PARSE_FAILED", safeMessage);
    throw new ApiError(500, "CV_PARSE_FAILED", safeMessage);
  }
}
