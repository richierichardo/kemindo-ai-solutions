import { and, desc, eq } from "drizzle-orm";
import { aiRuns, applications, candidateDocuments, candidates, jobRequisitions, vacancies } from "@/db/schema";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { ApiError, assertCompanyScope, audit } from "@/lib/recruitment/api";
import type { AuthUser } from "@/lib/auth/user";
import { checkHardRequirements, type HardRequirementCheck } from "./requirements";
import type { ParsedCvData } from "./cv-parser";
import { generateMatchingExplanation, matchingInputHash, MATCHING_PROMPT_VERSION, type MatchingContext, type MatchingOutput, DeepSeekProviderError } from "@/lib/ai/deepseek";

type StoredMatching = MatchingOutput & { hardRequirements: HardRequirementCheck; promptVersion: string; inputHash: string; generatedAt: string };

export async function getAccessibleApplication(user: AuthUser, applicationId: string) {
  const db = getDb();
  const application = await db.select().from(applications).where(eq(applications.id, applicationId)).limit(1).then((rows) => rows[0]);
  if (!application) throw new ApiError(404, "NOT_FOUND", "Application not found.");
  const vacancy = await db.select().from(vacancies).where(eq(vacancies.id, application.vacancyId)).limit(1).then((rows) => rows[0]);
  const requisition = vacancy ? await db.select().from(jobRequisitions).where(eq(jobRequisitions.id, vacancy.requisitionId)).limit(1).then((rows) => rows[0]) : undefined;
  if (!vacancy || !requisition) throw new ApiError(404, "NOT_FOUND", "Application vacancy not found.");
  assertCompanyScope(user, requisition.companyId, requisition.siteId);
  const candidate = await db.select().from(candidates).where(eq(candidates.id, application.candidateId)).limit(1).then((rows) => rows[0]);
  const document = await db.select().from(candidateDocuments).where(and(eq(candidateDocuments.candidateId, application.candidateId), eq(candidateDocuments.parseStatus, "completed"))).orderBy(desc(candidateDocuments.parsedAt)).limit(1).then((rows) => rows[0]);
  if (!candidate || !document?.parsedData) throw new ApiError(409, "CV_NOT_PARSED", "Parse the candidate CV before generating matching.");
  const parsed = document.parsedData as ParsedCvData;
  const hardRequirements = checkHardRequirements(requisition.requiredSkills, requisition.requiredCertifications, parsed);
  const context: MatchingContext = {
    jobTitle: vacancy.title, jobDescription: vacancy.description, requiredSkills: requisition.requiredSkills, requiredCertifications: requisition.requiredCertifications,
    candidate: { location: parsed.location, skills: parsed.skills, certifications: parsed.certifications, education: parsed.education, experience: parsed.experience, languages: parsed.languages, availability: parsed.availability },
  };
  return { application, vacancy, requisition, candidate, document, parsed, hardRequirements, context, inputHash: matchingInputHash(context) };
}

function asStoredMatching(value: unknown): StoredMatching | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<StoredMatching>;
  return typeof item.inputHash === "string" && typeof item.score === "number" && item.hardRequirements !== undefined ? value as StoredMatching : null;
}

async function latestRun(inputHash: string) {
  return getDb().select().from(aiRuns).where(and(eq(aiRuns.feature, "candidate_match"), eq(aiRuns.inputHash, inputHash))).orderBy(desc(aiRuns.createdAt)).limit(1).then((rows) => rows[0]);
}

export async function getMatchingResult(user: AuthUser, applicationId: string) {
  const resource = await getAccessibleApplication(user, applicationId);
  const stored = asStoredMatching(resource.application.fitExplanation);
  const run = await latestRun(resource.inputHash);
  return {
    applicationId, status: stored?.inputHash === resource.inputHash ? "completed" : run?.status === "failed" ? "failed" : run?.status === "requested" || run?.status === "running" ? "generating" : "not_generated",
    cached: Boolean(stored?.inputHash === resource.inputHash), fitScore: stored?.inputHash === resource.inputHash ? Number(resource.application.fitScore) : null,
    explanation: stored?.inputHash === resource.inputHash ? stored : null, hardRequirements: resource.hardRequirements,
    review: { stage: resource.application.stage, reviewedBy: resource.application.reviewedBy, reviewedAt: resource.application.reviewedAt, reviewNote: resource.application.reviewNote },
    aiRun: run ? { id: run.id, status: run.status, provider: run.provider, model: run.model, latencyMs: run.latencyMs, createdAt: run.createdAt } : null,
  };
}

export async function generateMatching(user: AuthUser, applicationId: string, force = false) {
  const resource = await getAccessibleApplication(user, applicationId);
  const stored = asStoredMatching(resource.application.fitExplanation);
  if (!force && stored?.inputHash === resource.inputHash) return getMatchingResult(user, applicationId);
  const existingRun = await latestRun(resource.inputHash);
  if (existingRun?.status === "requested" || existingRun?.status === "running") throw new ApiError(409, "MATCHING_IN_PROGRESS", "Matching is already being generated.");
  const db = getDb();
  const run = await db.insert(aiRuns).values({ userId: user.id, feature: "candidate_match", provider: "deepseek", model: getServerEnv().DEEPSEEK_MODEL, status: "requested", inputHash: resource.inputHash }).returning().then((rows) => rows[0]);
  if (!run) throw new Error("Unable to create AI run.");
  await audit(user.id, user.companyId, "application", applicationId, "matching_requested", { aiRunId: run.id });
  const startedAt = Date.now();
  await db.update(aiRuns).set({ status: "running", updatedAt: new Date() }).where(eq(aiRuns.id, run.id));
  try {
    const result = await generateMatchingExplanation(resource.context);
    const storedResult: StoredMatching = { ...result.output, hardRequirements: resource.hardRequirements, promptVersion: MATCHING_PROMPT_VERSION, inputHash: resource.inputHash, generatedAt: new Date().toISOString() };
    await db.transaction(async (tx) => {
      await tx.update(aiRuns).set({ status: "completed", outputJson: result.output, latencyMs: result.latencyMs, updatedAt: new Date() }).where(eq(aiRuns.id, run.id));
      await tx.update(applications).set({ fitScore: String(result.output.score), fitExplanation: storedResult, updatedAt: new Date() }).where(eq(applications.id, applicationId));
    });
    await audit(user.id, user.companyId, "application", applicationId, "matching_completed", { aiRunId: run.id, score: result.output.score });
    return getMatchingResult(user, applicationId);
  } catch (error) {
    const message = error instanceof DeepSeekProviderError ? error.message : "Matching provider failed. Retry later.";
    await db.update(aiRuns).set({ status: "failed", error: message, latencyMs: Date.now() - startedAt, updatedAt: new Date() }).where(eq(aiRuns.id, run.id));
    await audit(user.id, user.companyId, "application", applicationId, "matching_failed", { aiRunId: run.id });
    if (error instanceof DeepSeekProviderError) throw new ApiError(502, "MATCHING_PROVIDER_FAILED", message);
    throw error;
  }
}

export async function reviewApplication(user: AuthUser, applicationId: string, action: "shortlist" | "reject", note?: string) {
  const resource = await getAccessibleApplication(user, applicationId);
  if (resource.application.stage !== "applied" && resource.application.stage !== "screening") throw new ApiError(409, "INVALID_APPLICATION_STAGE", "This application cannot be reviewed at its current stage.");
  if (action === "shortlist") {
    const stored = asStoredMatching(resource.application.fitExplanation);
    if (!stored || stored.inputHash !== resource.inputHash) throw new ApiError(409, "MATCHING_REQUIRED", "Generate a current matching result before shortlisting.");
    if (!resource.hardRequirements.hardRequirementsMet) throw new ApiError(409, "HARD_REQUIREMENT_BLOCKER", "Missing hard requirements must be reviewed before shortlisting.");
  }
  if (action === "reject" && (!note || note.trim().length < 2)) throw new ApiError(422, "REVIEW_NOTE_REQUIRED", "A review note is required when rejecting an application.");
  const updated = await getDb().update(applications).set({ stage: action === "shortlist" ? "shortlisted" : "rejected", reviewedBy: user.id, reviewedAt: new Date(), reviewNote: note?.trim() ?? null, updatedAt: new Date() }).where(eq(applications.id, applicationId)).returning().then((rows) => rows[0]);
  if (!updated) throw new Error("Unable to update application review.");
  await audit(user.id, user.companyId, "application", applicationId, action === "shortlist" ? "shortlisted" : "rejected", { reviewNoteProvided: Boolean(note) });
  return updated;
}
