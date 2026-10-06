import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/user";
import { getCandidateReadModels } from "@/lib/recruitment/candidates";
import { CandidateDetailClient } from "@/app/(app)/candidates/[id]/candidate-detail-client";

export default async function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("company_hr", "hiring_manager");
  const candidate = (await getCandidateReadModels(user, (await params).id))[0];
  if (!candidate) notFound();
  return <main className="page-content"><div className="page-heading"><div className="eyebrow">Candidate profile</div><h1>{candidate.fullName}</h1><p>Local extraction provides evidence for review. It does not make a hiring decision.</p></div><CandidateDetailClient candidate={candidate} canParse={user.roles.includes("company_hr")} /></main>;
}
