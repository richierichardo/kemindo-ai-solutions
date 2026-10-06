import { CandidateClient } from "@/app/(app)/candidates/candidate-client";
import { requireUser } from "@/lib/auth/user";

export default async function CandidatesPage() {
  const user = await requireUser();
  return <main className="page-content"><div className="page-heading"><div className="eyebrow">Candidate intake</div><h1>Candidates</h1><p>Collect CVs against published vacancies. Parsing and matching will be added in the next plans.</p></div><CandidateClient canUpload={user.roles.includes("company_hr")} /></main>;
}
