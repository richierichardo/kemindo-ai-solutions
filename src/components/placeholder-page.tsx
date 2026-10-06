import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui";

export function PlaceholderPage({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return <main className="page-content"><div className="page-heading"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{children ?? <EmptyState title="Feature ready for the next plan" description="This route is connected to the authenticated shell. The workflow will be implemented in the next recruitment plan." />}</main>;
}
