import { eq } from "drizzle-orm";
import { applications, candidateDocuments, candidates, jobRequisitions, vacancies } from "@/db/schema";
import { getDb } from "@/lib/db";
import type { AuthUser } from "@/lib/auth/user";

type CandidateReadModel = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  location: string | null;
  consentStatus: "pending" | "granted" | "withdrawn";
  source: string;
  createdAt: Date;
  updatedAt: Date;
  documents: Array<{ id: string; documentType: string; originalFilename: string; mimeType: string; sha256: string; createdAt: Date }>;
  applications: Array<{ id: string; stage: string; humanDecision: string; vacancyId: string; vacancyTitle: string; companyId: string; siteId: string | null; createdAt: Date }>;
};

export async function getCandidateReadModels(user: AuthUser, candidateId?: string): Promise<CandidateReadModel[]> {
  const db = getDb();
  const [candidateRows, documentRows, applicationRows, vacancyRows, requisitionRows] = await Promise.all([
    db.select().from(candidates),
    db.select({ id: candidateDocuments.id, candidateId: candidateDocuments.candidateId, documentType: candidateDocuments.documentType, originalFilename: candidateDocuments.originalFilename, mimeType: candidateDocuments.mimeType, sha256: candidateDocuments.sha256, createdAt: candidateDocuments.createdAt }).from(candidateDocuments),
    db.select().from(applications),
    db.select().from(vacancies),
    db.select().from(jobRequisitions),
  ]);
  const vacancyMap = new Map(vacancyRows.map((row) => [row.id, row]));
  const requisitionMap = new Map(requisitionRows.map((row) => [row.id, row]));
  const visibleApplications = applicationRows.map((application) => {
    const vacancy = vacancyMap.get(application.vacancyId);
    const requisition = vacancy ? requisitionMap.get(vacancy.requisitionId) : undefined;
    return requisition && vacancy && (!user.companyId || requisition.companyId === user.companyId) && (!user.siteId || requisition.siteId === user.siteId) ? { application, vacancy, requisition } : null;
  }).filter((row): row is NonNullable<typeof row> => Boolean(row));
  const visibleCandidateIds = new Set(visibleApplications.map((row) => row.application.candidateId));
  return candidateRows.filter((candidate) => visibleCandidateIds.has(candidate.id) && (!candidateId || candidate.id === candidateId)).map((candidate) => ({
    id: candidate.id, fullName: candidate.fullName, email: candidate.email, phone: candidate.phone, location: candidate.location,
    consentStatus: candidate.consentStatus, source: candidate.source, createdAt: candidate.createdAt, updatedAt: candidate.updatedAt,
    documents: documentRows.filter((document) => document.candidateId === candidate.id),
    applications: visibleApplications.filter((row) => row.application.candidateId === candidate.id).map(({ application, vacancy, requisition }) => ({
      id: application.id, stage: application.stage, humanDecision: application.humanDecision, vacancyId: vacancy.id, vacancyTitle: vacancy.title,
      companyId: requisition.companyId, siteId: requisition.siteId, createdAt: application.createdAt,
    })),
  }));
}

export async function getPublishedVacancies(user: AuthUser) {
  const db = getDb();
  const rows = await db.select({ id: vacancies.id, title: vacancies.title, companyId: jobRequisitions.companyId, siteId: jobRequisitions.siteId })
    .from(vacancies).innerJoin(jobRequisitions, eq(vacancies.requisitionId, jobRequisitions.id));
  return rows.filter((row) => row.companyId === user.companyId && (!user.siteId || row.siteId === user.siteId));
}
