"use client";

import { useEffect, useState } from "react";
import { Button, EmptyState, ErrorState, FormField, Input, LoadingState, Select, StatusBadge } from "@/components/ui";

type Vacancy = { id: string; title: string };
type Candidate = { id: string; fullName: string; email: string; phone: string | null; location: string | null; consentStatus: string; documents: Array<{ id: string; originalFilename: string; createdAt: string }>; applications: Array<{ id: string; stage: string; humanDecision: string; vacancyTitle: string; createdAt: string }> };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? "Request failed.");
  return body.data;
}

export function CandidateClient({ canUpload }: { canUpload: boolean }) {
  const [rows, setRows] = useState<Candidate[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [vacancyId, setVacancyId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    setLoading(true);
    try {
      const candidateData = await request<Candidate[]>("/api/candidates");
      setRows(candidateData);
      if (canUpload) {
        const optionData = await request<{ vacancies: Vacancy[] }>("/api/candidates/options");
        setVacancies(optionData.vacancies);
        if (!vacancyId && optionData.vacancies[0]) setVacancyId(optionData.vacancies[0].id);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load candidates.");
    } finally {
      setLoading(false);
    }
  }

  // The initial load intentionally runs once; upload actions reload explicitly.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file || !vacancyId) { setError("Select a published vacancy and upload a PDF CV."); return; }
    setSaving(true); setError(""); setSuccess("");
    const body = new FormData();
    body.set("fullName", fullName); body.set("email", email); body.set("phone", phone); body.set("location", location); body.set("cv", file);
    try {
      await request(`/api/vacancies/${vacancyId}/applications`, { method: "POST", body });
      setFullName(""); setEmail(""); setPhone(""); setLocation(""); setFile(null); setSuccess("Candidate and application created.");
      const input = document.getElementById("candidate-cv") as HTMLInputElement | null; if (input) input.value = "";
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to upload CV.");
    } finally { setSaving(false); }
  }

  if (loading && rows.length === 0) return <LoadingState label="Loading candidates" />;
  return <div className="candidate-workspace">
    {error ? <ErrorState description={error} /> : null}
    {success ? <section className="success-panel" role="status">{success}</section> : null}
    {canUpload ? <form className="candidate-intake-form" onSubmit={submit}>
      <div className="section-kicker">HR intake</div><h2>Upload a candidate CV</h2>
      <FormField label="Published vacancy"><Select value={vacancyId} onChange={(event) => setVacancyId(event.target.value)} required><option value="">Select vacancy</option>{vacancies.map((vacancy) => <option key={vacancy.id} value={vacancy.id}>{vacancy.title}</option>)}</Select></FormField>
      <FormField label="Full name"><Input value={fullName} onChange={(event) => setFullName(event.target.value)} required /></FormField>
      <FormField label="Email"><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></FormField>
      <div className="form-two-column"><FormField label="Phone"><Input value={phone} onChange={(event) => setPhone(event.target.value)} /></FormField><FormField label="Location"><Input value={location} onChange={(event) => setLocation(event.target.value)} /></FormField></div>
      <FormField label="CV PDF"><Input id="candidate-cv" type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required /><small className="form-hint">PDF only, maximum 10 MB. Consent starts as pending.</small></FormField>
      <Button type="submit" disabled={saving || vacancies.length === 0}>{saving ? "Uploading…" : "Create candidate application"}</Button>
    </form> : null}
    <section className="candidate-list"><div className="workspace-toolbar"><div><strong>{rows.length} candidate{rows.length === 1 ? "" : "s"}</strong><span className="toolbar-note">CV metadata only; parsing starts in Plan 07.</span></div></div>
      {rows.length === 0 ? <EmptyState title="No candidates yet" description={canUpload ? "Choose a published vacancy and upload the first CV." : "No candidates are available in your current scope."} /> : rows.map((candidate) => <article className="candidate-card" key={candidate.id}><div className="card-heading"><div><span className="profile-label">Candidate</span><h2>{candidate.fullName}</h2><p>{candidate.email}{candidate.location ? ` · ${candidate.location}` : ""}</p></div><StatusBadge>{candidate.consentStatus} consent</StatusBadge></div><div className="candidate-meta"><span><strong>Applications:</strong> {candidate.applications.map((application) => `${application.vacancyTitle} (${application.stage})`).join(", ")}</span><span><strong>Documents:</strong> {candidate.documents.length}</span></div><div className="card-actions">{candidate.documents.map((document) => <a className="button button-secondary" href={`/api/candidate-documents/${document.id}`} target="_blank" rel="noreferrer" key={document.id}>View {document.originalFilename}</a>)}<a className="button button-secondary" href={`/candidates/${candidate.id}`}>Open profile</a></div></article>)}
    </section>
  </div>;
}
