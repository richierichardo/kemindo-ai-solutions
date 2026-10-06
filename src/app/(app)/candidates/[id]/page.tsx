import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/ui";
import { requireRole } from "@/lib/auth/user";
import { getCandidateReadModels } from "@/lib/recruitment/candidates";

export default async function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("company_hr", "hiring_manager");
  const candidate = (await getCandidateReadModels(user, (await params).id))[0];
  if (!candidate) notFound();
  return <main className="page-content"><div className="page-heading"><div className="eyebrow">Candidate profile</div><h1>{candidate.fullName}</h1><p>Structured CV parsing and matching are not available until the next MVP plans.</p></div><div className="profile-panel"><div><span className="profile-label">Contact</span><strong>{candidate.email}</strong><span>{candidate.phone ?? "No phone provided"} · {candidate.location ?? "No location provided"}</span></div><div><span className="profile-label">Consent</span><StatusBadge>{candidate.consentStatus}</StatusBadge></div><div><span className="profile-label">Applications</span>{candidate.applications.map((application) => <span key={application.id}>{application.vacancyTitle} · {application.stage} · {application.humanDecision}</span>)}</div><div><span className="profile-label">CV documents</span>{candidate.documents.map((document) => <a href={`/api/candidate-documents/${document.id}`} target="_blank" rel="noreferrer" key={document.id}>{document.originalFilename}</a>)}</div></div></main>;
}
