"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
type Interview = { id: string; candidateName: string; vacancyTitle: string; scheduledAt: string; status: string };
export function InterviewWorkspace({ role }: { role: string }) {
  const [items, setItems] = useState<Interview[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { fetch("/api/interviews").then(async (r) => { const body = await r.json(); if (!r.ok) throw new Error(body.error?.message ?? "Unable to load interviews."); setItems(body.data ?? []); }).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="state-card">Loading interviews…</div>;
  if (error) return <div className="state-card state-error"><strong>Server error</strong><p>{error}</p><button className="button button-secondary" onClick={() => location.reload()}>Retry</button></div>;
  return <section className="stack-lg"><div className="section-heading"><div><div className="eyebrow">Workspace</div><h2>Interview pipeline</h2></div>{role === "company_hr" && <span className="status-badge">HR scheduling enabled</span>}</div>{items.length === 0 ? <div className="state-card"><strong>No interviews scheduled</strong><p>Schedule an interview after an application is shortlisted.</p></div> : <div className="card-grid">{items.map((item) => <Link className="data-card" href={`/interviews/${item.id}`} key={item.id}><div className="card-meta"><span className="status-badge">{item.status}</span><span>{new Date(item.scheduledAt).toLocaleString()}</span></div><h3>{item.candidateName}</h3><p>{item.vacancyTitle}</p><span className="text-link">Open interview workspace →</span></Link>)}</div>}</section>;
}
