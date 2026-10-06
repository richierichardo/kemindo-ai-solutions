import { requireUser } from "@/lib/auth/user";
import { InterviewWorkspace } from "./interview-workspace";

export default async function InterviewsPage() {
  const user = await requireUser();
  return <main className="page-content"><div className="page-heading"><div className="eyebrow">Interview assistant</div><h1>Interviews</h1><p>Structured questions, evidence-based scorecards, and a human hiring decision.</p></div><InterviewWorkspace role={user.roles[0] ?? ""} /></main>;
}
