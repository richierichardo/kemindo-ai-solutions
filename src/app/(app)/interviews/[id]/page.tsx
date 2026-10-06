import { requireUser } from "@/lib/auth/user";
import { InterviewDetail } from "./interview-detail";
export default async function InterviewDetailPage() { const user = await requireUser(); return <main className="page-content"><InterviewDetail role={user.roles[0] ?? ""} /></main>; }
