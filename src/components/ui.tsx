import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  return <button className={`button button-${variant} ${className}`} {...props} />;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="input" {...props} />;
}

export function FormField({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return <label className="form-field"><span>{label}</span>{children}{error ? <small className="field-error">{error}</small> : null}</label>;
}

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "active" | "critical" }) {
  return <span className={`status-badge status-${tone}`}>{children}</span>;
}

export function Table({ children }: { children: ReactNode }) {
  return <div className="table-wrap"><table className="data-table">{children}</table></div>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <section className="state-panel empty-state"><div className="state-mark">—</div><h2>{title}</h2><p>{description}</p>{action}</section>;
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return <section className="state-panel" role="status" aria-live="polite"><div className="state-mark pulse">…</div><h2>{label}</h2><p>Please wait while the local workspace responds.</p></section>;
}

export function ErrorState({ title = "Something went wrong", description }: { title?: string; description: string }) {
  return <section className="state-panel error-state" role="alert"><div className="state-mark">!</div><h2>{title}</h2><p>{description}</p></section>;
}

export function PermissionDenied() {
  return <ErrorState title="Permission denied" description="Your current role does not have access to this recruitment action." />;
}

export function EnvironmentBadge({ environment }: { environment: string }) {
  return <span className="environment-badge">{environment.toUpperCase()}</span>;
}
