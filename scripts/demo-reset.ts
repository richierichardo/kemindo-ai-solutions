import { config as loadEnv } from "dotenv";
import { eq, inArray } from "drizzle-orm";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { getDb } from "../src/lib/db";
import { getServerEnv } from "../src/lib/env";
import { hashPassword } from "../src/lib/auth/password";
import { auditLogs, applications, candidateDocuments, candidates, companies, divisions, interviewScores, interviews, jobFamilies, jobRequisitions, roles, sites, userRoles, users, vacancies, aiRuns } from "../src/db/schema";
import { createDemoPdf, demoCandidates, demoFileHash, DEMO_COMPANY_CODE, DEMO_PASSWORD } from "../src/lib/demo/fixtures";

loadEnv({ path: ".env.local" }); loadEnv();

const usersSeed = [
  { email: "hr.demo@kemindo.local", fullName: "Demo Company HR", role: "company_hr" as const },
  { email: "interviewer.demo@kemindo.local", fullName: "Demo Interviewer", role: "interviewer" as const },
  { email: "hiring.manager.demo@kemindo.local", fullName: "Demo Hiring Manager", role: "hiring_manager" as const },
];

async function clearDemoFiles(storageRoot: string) {
  for (const directory of ["fixtures", "reports", path.join("uploads", "candidates")]) {
    const target = path.resolve(storageRoot, directory);
    await rm(target, { recursive: true, force: true });
    await mkdir(target, { recursive: true });
    await writeFile(path.join(target, ".gitkeep"), "\n");
  }
}

async function main() {
  const env = getServerEnv();
  if (env.APP_ENV !== "demo") throw new Error("demo:reset is allowed only when APP_ENV=demo.");
  await clearDemoFiles(env.STORAGE_ROOT);
  const db = getDb();
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const result = await db.transaction(async (tx) => {
    const company = await tx.insert(companies).values({ code: DEMO_COMPANY_CODE, name: "PT Kemindo Demo", legalName: "PT Kemindo Demo", status: "active" }).onConflictDoUpdate({ target: companies.code, set: { name: "PT Kemindo Demo", status: "active", updatedAt: new Date() } }).returning({ id: companies.id }).then((rows) => rows[0]);
    if (!company) throw new Error("Unable to create demo company.");
    const oldRequisitions = await tx.select({ id: jobRequisitions.id }).from(jobRequisitions).where(eq(jobRequisitions.companyId, company.id));
    const oldVacancies = oldRequisitions.length ? await tx.select({ id: vacancies.id }).from(vacancies).where(inArray(vacancies.requisitionId, oldRequisitions.map((row) => row.id))) : [];
    const oldApplications = oldVacancies.length ? await tx.select({ id: applications.id, candidateId: applications.candidateId }).from(applications).where(inArray(applications.vacancyId, oldVacancies.map((row) => row.id))) : [];
    const oldInterviews = oldApplications.length ? await tx.select({ id: interviews.id }).from(interviews).where(inArray(interviews.applicationId, oldApplications.map((row) => row.id))) : [];
    if (oldInterviews.length) await tx.delete(interviewScores).where(inArray(interviewScores.interviewId, oldInterviews.map((row) => row.id)));
    if (oldApplications.length) await tx.delete(interviews).where(inArray(interviews.applicationId, oldApplications.map((row) => row.id)));
    if (oldApplications.length) await tx.delete(applications).where(inArray(applications.id, oldApplications.map((row) => row.id)));
    const oldCandidates = oldApplications.map((row) => row.candidateId);
    if (oldCandidates.length) await tx.delete(candidateDocuments).where(inArray(candidateDocuments.candidateId, oldCandidates));
    if (oldCandidates.length) await tx.delete(candidates).where(inArray(candidates.id, oldCandidates));
    if (oldVacancies.length) await tx.delete(vacancies).where(inArray(vacancies.id, oldVacancies.map((row) => row.id)));
    if (oldRequisitions.length) await tx.delete(jobRequisitions).where(inArray(jobRequisitions.id, oldRequisitions.map((row) => row.id)));
    const division = await tx.insert(divisions).values({ companyId: company.id, code: "RECRUITMENT", name: "Recruitment Intelligence", businessArea: "factory" }).onConflictDoUpdate({ target: [divisions.companyId, divisions.code], set: { name: "Recruitment Intelligence", updatedAt: new Date() } }).returning({ id: divisions.id }).then((rows) => rows[0]);
    const site = await tx.insert(sites).values({ companyId: company.id, code: "DEMO-SITE", name: "Kemindo Demo Site", location: "Indonesia", timezone: "Asia/Jakarta", siteType: "factory" }).onConflictDoUpdate({ target: [sites.companyId, sites.code], set: { name: "Kemindo Demo Site", updatedAt: new Date() } }).returning({ id: sites.id }).then((rows) => rows[0]);
    const family = await tx.insert(jobFamilies).values({ code: "OPERATIONS", name: "Operations", description: "Demo recruitment job family" }).onConflictDoUpdate({ target: jobFamilies.code, set: { name: "Operations", updatedAt: new Date() } }).returning({ id: jobFamilies.id }).then((rows) => rows[0]);
    if (!division || !site || !family) throw new Error("Unable to create demo organisation scope.");
    const roleRows = await Promise.all(usersSeed.map((item) => tx.insert(roles).values({ code: item.role, name: item.role.replaceAll("_", " ") }).onConflictDoUpdate({ target: roles.code, set: { name: item.role, updatedAt: new Date() } }).returning({ id: roles.id, code: roles.code }).then((rows) => rows[0])));
    const seededUsers = [] as Array<{ id: string; role: typeof usersSeed[number]["role"] }>;
    for (const item of usersSeed) { const role = roleRows.find((row) => row?.code === item.role); if (!role) throw new Error(`Missing role ${item.role}`); const user = await tx.insert(users).values({ companyId: company.id, siteId: site.id, email: item.email, fullName: item.fullName, passwordHash, isActive: true }).onConflictDoUpdate({ target: users.email, set: { companyId: company.id, siteId: site.id, fullName: item.fullName, passwordHash, isActive: true, updatedAt: new Date() } }).returning({ id: users.id }).then((rows) => rows[0]); if (!user) throw new Error(`Unable to seed ${item.email}`); await tx.insert(userRoles).values({ userId: user.id, roleId: role.id }).onConflictDoNothing(); seededUsers.push({ id: user.id, role: item.role }); }
    const hr = seededUsers.find((item) => item.role === "company_hr")?.id; const interviewer = seededUsers.find((item) => item.role === "interviewer")?.id; const manager = seededUsers.find((item) => item.role === "hiring_manager")?.id;
    if (!hr || !interviewer || !manager) throw new Error("Unable to resolve demo users.");
    const requisition = await tx.insert(jobRequisitions).values({ companyId: company.id, divisionId: division.id, siteId: site.id, jobFamilyId: family.id, title: "Production Operations Specialist", employmentType: "permanent", shiftRequired: true, status: "approved", requiredSkills: ["chemical handling", "production operations"], requiredCertifications: ["K3"], approvedBy: manager, approvedAt: new Date(), createdBy: hr, updatedBy: hr }).returning({ id: jobRequisitions.id }).then((rows) => rows[0]);
    if (!requisition) throw new Error("Unable to seed requisition.");
    const vacancy = await tx.insert(vacancies).values({ requisitionId: requisition.id, title: "Production Operations Specialist", description: "Operate production equipment safely and maintain shift records.", status: "published", publishedAt: new Date(), createdBy: hr, publishedBy: hr, updatedBy: hr }).returning({ id: vacancies.id }).then((rows) => rows[0]);
    if (!vacancy) throw new Error("Unable to seed vacancy.");
    const fixtureRows: Array<{ candidateId: string; applicationId: string; documentId: string }> = [];
    for (let index = 0; index < demoCandidates.length; index += 1) { const item = demoCandidates[index]; const candidate = await tx.insert(candidates).values({ fullName: item.name, email: item.email, location: item.location, source: "demo-reset" }).returning({ id: candidates.id }).then((rows) => rows[0]); if (!candidate) throw new Error("Unable to seed candidate."); const application = await tx.insert(applications).values({ vacancyId: vacancy.id, candidateId: candidate.id, stage: item.stage, fitScore: item.key === "matched" ? "88" : item.key === "missing" ? "54" : null, fitExplanation: item.key === "matched" ? { score: 88, summary: "Strong structured fit with all hard requirements met.", strengths: item.skills, gaps: [], evidence: [{ category: "skill", claim: "Required skills", evidence: "Parsed structured CV data" }], hardRequirementsMet: true } : item.key === "missing" ? { score: 54, summary: "Review required because a hard certification is missing.", strengths: item.skills, gaps: ["K3"], evidence: [], hardRequirementsMet: false } : null }).returning({ id: applications.id }).then((rows) => rows[0]); if (!application) throw new Error("Unable to seed application."); const documentId = randomUUID(); const bytes = createDemoPdf(item.name, `Email: ${item.email}\nLocation: ${item.location}\nSkills: ${item.skills.join(", ")}\nCertifications: ${item.certifications.join(", ") || "None"}\nEducation\nDiploma Operations\nExperience\nProduction Operator 2020 - present`); const relativePath = `fixtures/cv-${String(index + 1).padStart(2, "0")}-${item.key}.pdf`; await writeFile(path.resolve(env.STORAGE_ROOT, relativePath), bytes); await tx.insert(candidateDocuments).values({ id: documentId, candidateId: candidate.id, documentType: "cv", originalFilename: `${item.key}-demo.pdf`, localPath: relativePath, mimeType: "application/pdf", sha256: demoFileHash(bytes), parsedText: `${item.name} ${item.skills.join(" ")} ${item.certifications.join(" ")}`, parsedData: { fullName: item.name, email: item.email, phone: null, location: item.location, skills: item.skills, certifications: item.certifications, education: [{ raw: "Diploma Operations", institution: "Demo Institute", degree: "Diploma", field: "Operations", startYear: "2018", endYear: "2020" }], experience: [{ raw: "Production Operator 2020 - present", employer: "Demo Factory", title: "Production Operator", startDate: "2020", endDate: "present", description: "Production operations" }], languages: ["Indonesian"], availability: "30 days" }, parseStatus: "completed", parsedAt: new Date() }); fixtureRows.push({ candidateId: candidate.id, applicationId: application.id, documentId }); }
    const primary = fixtureRows[0]; if (!primary) throw new Error("Missing primary fixture.");
    const questions = { version: "interview-questions-demo-v1", generatedAt: new Date().toISOString(), questions: [{ order: 1, category: "technical", question: "How do you verify production equipment is safe before a shift?", intent: "Assess technical and safety practice." }, { order: 2, category: "problem solving", question: "Describe a production issue you investigated and resolved.", intent: "Assess structured problem solving." }, { order: 3, category: "communication", question: "How do you communicate a process risk to your team?", intent: "Assess communication and safety mindset." }] };
    const interview = await tx.insert(interviews).values({ applicationId: primary.applicationId, interviewerId: interviewer, scheduledAt: new Date(Date.now() - 86400000), status: "completed", notes: "Demo scorecard evidence captured.", questions, questionsGeneratedAt: new Date(), summaryGeneratedAt: new Date(), aiSummary: JSON.stringify({ summary: "Candidate demonstrates relevant operational experience and safety awareness.", strengths: ["Chemical handling", "Production operations"], concerns: [], evidence: [{ competency: "safety mindset", observation: "Explained pre-shift safety verification.", source: "scorecard" }], recommendation: "proceed_to_decision" }) }).returning({ id: interviews.id, aiSummary: interviews.aiSummary }).then((rows) => rows[0]);
    if (!interview) throw new Error("Unable to seed interview.");
    await tx.insert(interviewScores).values(["technical knowledge", "problem solving", "communication", "safety mindset", "role fit"].map((competency) => ({ interviewId: interview.id, competency, score: 4, evidence: `Demo evidence for ${competency}.`, comment: null })));
    await tx.insert(aiRuns).values([{ userId: hr, feature: "candidate_match", provider: "demo-fixture", model: "deterministic", status: "completed", inputHash: "demo-candidate-match", outputJson: { score: 88 } }, { userId: hr, feature: "interview_questions", provider: "demo-fixture", model: "deterministic", status: "completed", inputHash: "demo-interview-questions", outputJson: questions }, { userId: manager, feature: "interview_summary", provider: "demo-fixture", model: "deterministic", status: "completed", inputHash: "demo-interview-summary", outputJson: JSON.parse(interview.aiSummary ?? "{}") }]);
    await tx.delete(auditLogs).where(eq(auditLogs.companyId, company.id));
    return { companyId: company.id, vacancyId: vacancy.id, candidateCount: fixtureRows.length };
  });
  console.log(`Demo reset complete: ${result.candidateCount} candidates, vacancy ${result.vacancyId}. Password: ${DEMO_PASSWORD}`);
}

main().catch(async (error: unknown) => { try { const env = getServerEnv(); if (env.APP_ENV === "demo") await clearDemoFiles(env.STORAGE_ROOT); } catch { /* preserve the original reset error */ } console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
