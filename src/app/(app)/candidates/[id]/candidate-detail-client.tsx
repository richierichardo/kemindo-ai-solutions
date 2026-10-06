"use client";

import { useEffect, useState } from "react";
import { Button, ErrorState, StatusBadge } from "@/components/ui";

type Requirement = { requirement: string; matched: boolean; evidence: string | null; type: "skill" | "certification" };
type Matching = { status: "not_generated" | "generating" | "completed" | "failed"; fitScore: number | null; explanation: { score: number; summary: string; strengths: string[]; gaps: string[]; evidence: Array<{ category: string; claim: string; evidence: string }> } | null };
type Candidate = {
  id: string; fullName: string; email: string; phone: string | null; location: string | null; consentStatus: string;
  documents: Array<{ id: string; originalFilename: string; parseStatus: string; parseError: string | null; parsedData: { fullName: string | null; email: string | null; phone: string | null; location: string | null; skills: string[]; certifications: string[]; education: Array<{ raw: string }>; experience: Array<{ raw: string }>; languages: string[]; availability: string | null } | null }>;
  applications: Array<{ id: string; vacancyTitle: string; stage: string; humanDecision: string; hardRequirements: { hardRequirementsMet: boolean; skills: Requirement[]; certifications: Requirement[] } | null }>;
};

export function CandidateDetailClient({ candidate, canParse }: { candidate: Candidate; canParse: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [matching, setMatching] = useState<Record<string, Matching>>({});

  async function loadMatching() {
    const results = await Promise.all(candidate.applications.map(async (application) => {
      const response = await fetch(`/api/applications/${application.id}/matching`);
      const body = await response.json();
      return response.ok ? [application.id, body.data] as const : null;
    }));
    setMatching(Object.fromEntries(results.filter((result): result is readonly [string, Matching] => Boolean(result))));
  }

  // Candidate identity is fixed for this detail page; refresh matching after each action explicitly.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadMatching(); }, []);

  async function parse(documentId: string) {
    setBusy(documentId); setError("");
    try {
      const response = await fetch(`/api/candidate-documents/${documentId}/parse`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Unable to parse CV.");
      window.location.reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to parse CV."); }
    finally { setBusy(null); }
  }

  async function matchingAction(applicationId: string, action: "generate" | "shortlist" | "reject", note?: string) {
    setBusy(applicationId); setError("");
    try {
      const path = action === "generate" ? "matching" : action;
      const response = await fetch(`/api/applications/${applicationId}/${path}`, { method: "POST", headers: action === "reject" ? { "content-type": "application/json" } : undefined, body: action === "reject" ? JSON.stringify({ note }) : action === "generate" ? JSON.stringify({ force: matching[applicationId]?.status === "completed" }) : undefined });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Matching action failed.");
      await loadMatching();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Matching action failed."); }
    finally { setBusy(null); }
  }

  return <div className="candidate-detail-workspace">
    {error ? <ErrorState description={error} /> : null}
    <div className="profile-panel">
      <div><span className="profile-label">Contact</span><strong>{candidate.email}</strong><span>{candidate.phone ?? "No phone provided"} · {candidate.location ?? "No location provided"}</span></div>
      <div><span className="profile-label">Consent</span><StatusBadge>{candidate.consentStatus}</StatusBadge></div>
      <div>
        <span className="profile-label">CV documents</span>
        {candidate.documents.map((document) => <div className="document-panel" key={document.id}>
          <div className="document-heading"><strong>{document.originalFilename}</strong><StatusBadge tone={document.parseStatus === "completed" ? "active" : document.parseStatus === "failed" ? "critical" : "neutral"}>{document.parseStatus}</StatusBadge></div>
          <div className="card-actions"><a className="button button-secondary" href={`/api/candidate-documents/${document.id}`} target="_blank" rel="noreferrer">View original PDF</a>{canParse && document.parseStatus !== "completed" ? <Button type="button" onClick={() => void parse(document.id)} disabled={busy === document.id}>{busy === document.id ? "Parsing…" : document.parseStatus === "failed" ? "Retry parse" : "Parse CV"}</Button> : null}</div>
          {document.parseError ? <p className="rejection-note">{document.parseError}</p> : null}
          {document.parsedData ? <div className="parsed-grid"><div><span className="profile-label">Parsed contact</span><span>{document.parsedData.fullName ?? "—"}</span><span>{document.parsedData.email ?? "—"}</span><span>{document.parsedData.phone ?? "—"}</span><span>{document.parsedData.location ?? "—"}</span></div><div><span className="profile-label">Skills</span><span>{document.parsedData.skills.join(", ") || "—"}</span><span className="profile-label">Certifications</span><span>{document.parsedData.certifications.join(", ") || "—"}</span></div><div><span className="profile-label">Education and experience</span>{[...document.parsedData.education, ...document.parsedData.experience].map((item, index) => <span key={`${item.raw}-${index}`}>{item.raw}</span>)}</div><div><span className="profile-label">Languages / availability</span><span>{document.parsedData.languages.join(", ") || "—"}</span><span>{document.parsedData.availability ?? "No availability found"}</span></div></div> : null}
        </div>)}
      </div>
      <div>
        <span className="profile-label">Applications and matching review</span>
        {candidate.applications.map((application) => {
          const result = matching[application.id];
          const canReview = result?.status === "completed" && application.stage !== "shortlisted" && application.stage !== "rejected";
          return <div className="requirement-panel" key={application.id}>
            <strong>{application.vacancyTitle}</strong><span>{application.stage} · human decision: {application.humanDecision}</span>
            {application.hardRequirements ? <><StatusBadge tone={application.hardRequirements.hardRequirementsMet ? "active" : "critical"}>{application.hardRequirements.hardRequirementsMet ? "All hard requirements met" : "Hard requirements need review"}</StatusBadge>{[...application.hardRequirements.skills, ...application.hardRequirements.certifications].map((item) => <span key={`${item.type}-${item.requirement}`}>{item.type}: {item.requirement} — {item.matched ? `matched (${item.evidence})` : "not found"}</span>)}</> : <span>Parse the CV to calculate deterministic requirement evidence.</span>}
            {result ? <><StatusBadge tone={result.status === "completed" ? "active" : result.status === "failed" ? "critical" : "neutral"}>Matching: {result.status}</StatusBadge>{result.explanation ? <><strong>Soft-fit score: {result.fitScore}/100</strong><span>{result.explanation.summary}</span><span><strong>Strengths:</strong> {result.explanation.strengths.join(", ") || "—"}</span><span><strong>Gaps:</strong> {result.explanation.gaps.join(", ") || "—"}</span>{result.explanation.evidence.map((item) => <span key={`${item.category}-${item.claim}`}>{item.category}: {item.claim} — {item.evidence}</span>)}</> : null}{canParse && result.status !== "generating" ? <div className="card-actions"><Button type="button" onClick={() => void matchingAction(application.id, "generate")} disabled={busy === application.id}>{result.status === "completed" ? "Regenerate matching" : result.status === "failed" ? "Retry matching" : "Generate matching"}</Button>{canReview && application.hardRequirements?.hardRequirementsMet ? <Button type="button" onClick={() => void matchingAction(application.id, "shortlist")} disabled={busy === application.id}>Shortlist</Button> : null}{canReview ? <Button variant="danger" type="button" onClick={() => { const note = window.prompt("Review note for rejection"); if (note) void matchingAction(application.id, "reject", note); }}>Reject</Button> : null}</div> : null}</> : null}
          </div>;
        })}
      </div>
    </div>
  </div>;
}
