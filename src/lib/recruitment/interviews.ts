import { and, desc, eq, inArray } from "drizzle-orm";
import { aiRuns, applications, candidateDocuments, candidates, interviewScores, interviews, jobRequisitions, vacancies } from "@/db/schema";
import { getDb } from "@/lib/db";
import { ApiError, assertCompanyScope, audit } from "@/lib/recruitment/api";
import { getAuthUserById, type AuthUser } from "@/lib/auth/user";
import { generateInterviewQuestions, generateInterviewSummary, interviewInputHash, INTERVIEW_QUESTIONS_PROMPT_VERSION, INTERVIEW_SUMMARY_PROMPT_VERSION, DeepSeekProviderError } from "@/lib/ai/deepseek";
import { scorecardSchema } from "@/lib/recruitment/validation";

export const INTERVIEW_COMPETENCIES = ["technical knowledge", "problem solving", "communication", "safety mindset", "role fit"] as const;
type InterviewStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

async function baseInterview(user: AuthUser, interviewId: string) {
  const db = getDb();
  const interview = await db.select().from(interviews).where(eq(interviews.id, interviewId)).limit(1).then((rows) => rows[0]);
  if (!interview) throw new ApiError(404, "NOT_FOUND", "Interview not found.");
  const application = await db.select().from(applications).where(eq(applications.id, interview.applicationId)).limit(1).then((rows) => rows[0]);
  const vacancy = application ? await db.select().from(vacancies).where(eq(vacancies.id, application.vacancyId)).limit(1).then((rows) => rows[0]) : undefined;
  const requisition = vacancy ? await db.select().from(jobRequisitions).where(eq(jobRequisitions.id, vacancy.requisitionId)).limit(1).then((rows) => rows[0]) : undefined;
  const candidate = application ? await db.select().from(candidates).where(eq(candidates.id, application.candidateId)).limit(1).then((rows) => rows[0]) : undefined;
  if (!application || !vacancy || !requisition || !candidate) throw new ApiError(404, "NOT_FOUND", "Interview application not found.");
  assertCompanyScope(user, requisition.companyId, requisition.siteId);
  if (user.roles.includes("interviewer") && !user.roles.some((role) => role === "company_hr" || role === "hiring_manager") && interview.interviewerId !== user.id) throw new ApiError(404, "NOT_FOUND", "Interview not found.");
  const scores = await db.select().from(interviewScores).where(eq(interviewScores.interviewId, interviewId));
  return { interview, application, vacancy, requisition, candidate, scores };
}

export async function baseInterviewForApi(user: AuthUser, interviewId: string) {
  const resource = await baseInterview(user, interviewId);
  return { ...resource, interview: { ...resource.interview, aiSummary: resource.interview.aiSummary ? JSON.parse(resource.interview.aiSummary) : null } };
}

export async function listInterviews(user: AuthUser) {
  const rows = await getDb().select({ interview: interviews, application: applications, vacancy: vacancies, requisition: jobRequisitions, candidate: candidates })
    .from(interviews).innerJoin(applications, eq(interviews.applicationId, applications.id)).innerJoin(vacancies, eq(applications.vacancyId, vacancies.id)).innerJoin(jobRequisitions, eq(vacancies.requisitionId, jobRequisitions.id)).innerJoin(candidates, eq(applications.candidateId, candidates.id));
  return rows.filter((row) => (!user.companyId || row.requisition.companyId === user.companyId) && (!user.siteId || row.requisition.siteId === user.siteId) && (user.roles.includes("company_hr") || user.roles.includes("hiring_manager") || row.interview.interviewerId === user.id)).map((row) => ({ id: row.interview.id, applicationId: row.application.id, candidateName: row.candidate.fullName, vacancyTitle: row.vacancy.title, interviewerId: row.interview.interviewerId, scheduledAt: row.interview.scheduledAt, status: row.interview.status }));
}

export async function createInterview(user: AuthUser, applicationId: string, interviewerId: string, scheduledAt: Date) {
  const db = getDb();
  const application = await db.select().from(applications).where(eq(applications.id, applicationId)).limit(1).then((rows) => rows[0]);
  const vacancy = application ? await db.select().from(vacancies).where(eq(vacancies.id, application.vacancyId)).limit(1).then((rows) => rows[0]) : undefined;
  const requisition = vacancy ? await db.select().from(jobRequisitions).where(eq(jobRequisitions.id, vacancy.requisitionId)).limit(1).then((rows) => rows[0]) : undefined;
  if (!application || !vacancy || !requisition) throw new ApiError(404, "NOT_FOUND", "Application not found.");
  assertCompanyScope(user, requisition.companyId, requisition.siteId);
  if (application.stage !== "shortlisted") throw new ApiError(409, "APPLICATION_NOT_SHORTLISTED", "Only shortlisted applications can be scheduled.");
  const interviewer = await getAuthUserById(interviewerId);
  if (!interviewer || !interviewer.roles.includes("interviewer") || !interviewer.companyId || interviewer.companyId !== requisition.companyId || (requisition.siteId && interviewer.siteId !== requisition.siteId)) throw new ApiError(422, "INVALID_INTERVIEWER", "The selected interviewer is not valid for this scope.");
  const active = await db.select({ id: interviews.id }).from(interviews).where(and(eq(interviews.applicationId, applicationId), inArray(interviews.status, ["scheduled", "in_progress"]))).limit(1);
  if (active[0]) throw new ApiError(409, "ACTIVE_INTERVIEW_EXISTS", "This application already has an active interview.");
  const row = await db.insert(interviews).values({ applicationId, interviewerId, scheduledAt }).returning().then((rows) => rows[0]);
  if (!row) throw new Error("Unable to create interview.");
  await audit(user.id, user.companyId, "interview", row.id, "scheduled", { applicationId, interviewerId });
  return row;
}

export async function changeInterviewStatus(user: AuthUser, interviewId: string, next: InterviewStatus) {
  const resource = await baseInterview(user, interviewId);
  const allowed: Record<InterviewStatus, InterviewStatus[]> = { scheduled: ["in_progress", "cancelled"], in_progress: ["completed", "cancelled"], completed: [], cancelled: [] };
  if (!allowed[resource.interview.status].includes(next)) throw new ApiError(409, "INVALID_INTERVIEW_STATUS", "This interview status transition is invalid.");
  if (next === "completed") await ensureCompleteScorecard(resource.scores);
  const row = await getDb().update(interviews).set({ status: next, updatedAt: new Date() }).where(eq(interviews.id, interviewId)).returning().then((rows) => rows[0]);
  await audit(user.id, user.companyId, "interview", interviewId, next === "completed" ? "completed" : next === "in_progress" ? "started" : "cancelled");
  return row;
}

async function ensureCompleteScorecard(scores: Array<{ competency: string; evidence: string }>) {
  const names = new Set(scores.map((score) => score.competency));
  if (names.size !== INTERVIEW_COMPETENCIES.length || INTERVIEW_COMPETENCIES.some((competency) => !names.has(competency)) || scores.some((score) => !score.evidence.trim())) throw new ApiError(409, "INCOMPLETE_SCORECARD", "All five competencies require scores and evidence.");
}

export async function saveScorecard(user: AuthUser, interviewId: string, input: unknown) {
  const resource = await baseInterview(user, interviewId);
  if (!user.roles.includes("interviewer") || resource.interview.interviewerId !== user.id) throw new ApiError(403, "FORBIDDEN", "Only the assigned interviewer can submit this scorecard.");
  if (resource.interview.status !== "in_progress") throw new ApiError(409, "INVALID_INTERVIEW_STATUS", "Scorecard can only be submitted while the interview is in progress.");
  const parsed = scorecardSchema.safeParse(input);
  if (!parsed.success) throw new ApiError(422, "VALIDATION_ERROR", "Scorecard is invalid.", parsed.error.flatten().fieldErrors);
  const names = parsed.data.scores.map((score) => score.competency);
  if (new Set(names).size !== INTERVIEW_COMPETENCIES.length || INTERVIEW_COMPETENCIES.some((competency) => !names.includes(competency))) throw new ApiError(422, "INVALID_COMPETENCIES", "The fixed scorecard competencies are required.");
  const db = getDb();
  const result = await db.transaction(async (tx) => {
    await tx.delete(interviewScores).where(eq(interviewScores.interviewId, interviewId));
    await tx.insert(interviewScores).values(parsed.data.scores.map((score) => ({ interviewId, competency: score.competency, score: score.score, evidence: score.evidence, comment: score.comment || null })));
    return tx.update(interviews).set({ notes: parsed.data.notes || null, updatedAt: new Date() }).where(eq(interviews.id, interviewId)).returning().then((rows) => rows[0]);
  });
  await audit(user.id, user.companyId, "interview", interviewId, "scorecard_submitted");
  return result;
}

async function aiContext(resource: Awaited<ReturnType<typeof baseInterview>>) {
  const document = await getDb().select({ parsedData: candidateDocuments.parsedData })
    .from(candidateDocuments)
    .where(and(eq(candidateDocuments.candidateId, resource.candidate.id), eq(candidateDocuments.parseStatus, "completed")))
    .orderBy(desc(candidateDocuments.parsedAt)).limit(1).then((rows) => rows[0]);
  if (!document?.parsedData) throw new ApiError(409, "CV_NOT_PARSED", "Parse the candidate CV before using the interview assistant.");
  const parsed = document.parsedData as { location?: string | null; skills?: string[]; certifications?: string[]; education?: unknown[]; experience?: unknown[]; languages?: string[]; availability?: string | null };
  return { jobTitle: resource.vacancy.title, jobDescription: resource.vacancy.description, requiredSkills: resource.requisition.requiredSkills, requiredCertifications: resource.requisition.requiredCertifications, candidate: { location: parsed.location, skills: parsed.skills, certifications: parsed.certifications, education: parsed.education, experience: parsed.experience, languages: parsed.languages, availability: parsed.availability }, matching: resource.application.fitExplanation, questions: resource.interview.questions, notes: resource.interview.notes, scores: resource.scores.map((score) => ({ competency: score.competency, score: score.score, evidence: score.evidence, comment: score.comment })) };
}

async function runInterviewAi(user: AuthUser, interviewId: string, kind: "questions" | "summary", force: boolean) {
  const resource = await baseInterview(user, interviewId);
  if (kind === "summary") { if (resource.interview.status !== "completed") throw new ApiError(409, "INTERVIEW_NOT_COMPLETED", "Complete the interview before generating a summary."); await ensureCompleteScorecard(resource.scores); }
  const promptVersion = kind === "questions" ? INTERVIEW_QUESTIONS_PROMPT_VERSION : INTERVIEW_SUMMARY_PROMPT_VERSION;
  const context = await aiContext(resource);
  const inputHash = interviewInputHash(promptVersion, context);
  const previous = await getDb().select().from(aiRuns).where(and(eq(aiRuns.feature, kind === "questions" ? "interview_questions" : "interview_summary"), eq(aiRuns.inputHash, inputHash))).orderBy(desc(aiRuns.createdAt)).limit(1).then((rows) => rows[0]);
  if (!force && previous?.status === "completed") return resource;
  if (previous?.status === "running" || previous?.status === "requested") throw new ApiError(409, "AI_RUN_IN_PROGRESS", "This interview AI action is already running.");
  const db = getDb();
  const run = await db.insert(aiRuns).values({ userId: user.id, feature: kind === "questions" ? "interview_questions" : "interview_summary", provider: "deepseek", model: (await import("@/lib/env")).getServerEnv().DEEPSEEK_MODEL, status: "running", inputHash }).returning().then((rows) => rows[0]);
  await audit(user.id, user.companyId, "interview", interviewId, `${kind}_requested`, { aiRunId: run.id });
  try {
    const result = kind === "questions" ? await generateInterviewQuestions(context) : await generateInterviewSummary(context);
    await db.update(aiRuns).set({ status: "completed", outputJson: result.output, latencyMs: result.latencyMs, updatedAt: new Date() }).where(eq(aiRuns.id, run.id));
    if (kind === "questions") await db.update(interviews).set({ questions: { ...result.output, version: promptVersion, generatedAt: new Date().toISOString() }, questionsGeneratedAt: new Date(), questionsError: null, updatedAt: new Date() }).where(eq(interviews.id, interviewId));
    else await db.update(interviews).set({ aiSummary: JSON.stringify(result.output), summaryGeneratedAt: new Date(), summaryError: null, updatedAt: new Date() }).where(eq(interviews.id, interviewId));
    await audit(user.id, user.companyId, "interview", interviewId, `${kind}_completed`, { aiRunId: run.id });
    return baseInterview(user, interviewId);
  } catch (error) {
    const message = error instanceof DeepSeekProviderError ? error.message : "Interview AI provider failed. Retry later.";
    await db.update(aiRuns).set({ status: "failed", error: message, updatedAt: new Date() }).where(eq(aiRuns.id, run.id));
    await db.update(interviews).set(kind === "questions" ? { questionsError: message, updatedAt: new Date() } : { summaryError: message, updatedAt: new Date() }).where(eq(interviews.id, interviewId));
    await audit(user.id, user.companyId, "interview", interviewId, `${kind}_failed`, { aiRunId: run.id });
    throw new ApiError(502, "INTERVIEW_AI_FAILED", message);
  }
}

export const generateQuestions = (user: AuthUser, id: string, force: boolean) => runInterviewAi(user, id, "questions", force);
export const generateSummary = (user: AuthUser, id: string, force: boolean) => runInterviewAi(user, id, "summary", force);

export async function makeHiringDecision(user: AuthUser, applicationId: string, decision: "approved" | "rejected" | "on_hold", note: string) {
  const application = await getDb().select().from(applications).where(eq(applications.id, applicationId)).limit(1).then((rows) => rows[0]);
  if (!application) throw new ApiError(404, "NOT_FOUND", "Application not found.");
  const scope = await getDb().select({ companyId: jobRequisitions.companyId, siteId: jobRequisitions.siteId }).from(jobRequisitions).innerJoin(vacancies, eq(vacancies.requisitionId, jobRequisitions.id)).where(eq(vacancies.id, application.vacancyId)).limit(1).then((rows) => rows[0]);
  if (!scope) throw new ApiError(404, "NOT_FOUND", "Application scope not found.");
  assertCompanyScope(user, scope.companyId, scope.siteId);
  const interview = await getDb().select().from(interviews).where(eq(interviews.applicationId, applicationId)).orderBy(desc(interviews.createdAt)).limit(1).then((rows) => rows[0]);
  if (!interview || interview.status !== "completed" || !interview.aiSummary) throw new ApiError(409, "DECISION_GATE_NOT_MET", "A completed interview with summary is required before the hiring decision.");
  const scores = await getDb().select().from(interviewScores).where(eq(interviewScores.interviewId, interview.id));
  await ensureCompleteScorecard(scores);
  const updated = await getDb().update(applications).set({ stage: "decision", humanDecision: decision, reviewedBy: user.id, reviewedAt: new Date(), reviewNote: note, updatedAt: new Date() }).where(eq(applications.id, applicationId)).returning().then((rows) => rows[0]);
  await audit(user.id, user.companyId, "application", applicationId, `hiring_decision_${decision}`);
  return updated;
}
