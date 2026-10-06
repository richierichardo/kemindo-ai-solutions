"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, FormField, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
      const body = await response.json();
      if (!response.ok) { setError(body.error ?? "Unable to sign in."); return; }
      router.push("/");
      router.refresh();
    } catch { setError("The local authentication service is unavailable."); }
    finally { setSubmitting(false); }
  }

  return <main className="login-page"><section className="login-card" aria-labelledby="login-title"><div className="brand brand-login"><span className="brand-kicker">KEMINDO</span><span>Recruitment<br />Intelligence</span></div><div className="eyebrow">Local demo workspace</div><h1 id="login-title">Sign in</h1><p className="login-intro">Use your recruitment role to access the CV and interview workspace.</p><form onSubmit={submit} noValidate><FormField label="Email" error={error && !email ? "Email is required." : undefined}><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /></FormField><FormField label="Password"><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></FormField>{error ? <p className="form-error" role="alert">{error}</p> : null}<Button type="submit" disabled={submitting}>{submitting ? "Signing in…" : "Sign in"}</Button></form><p className="login-note">Demo users are created with <code>npm run db:seed:auth</code>.</p></section></main>;
}
