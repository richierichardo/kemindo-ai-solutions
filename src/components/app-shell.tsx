"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Button, EnvironmentBadge } from "@/components/ui";
import type { AuthUser } from "@/lib/auth/user";

const navigation = [
  { href: "/", label: "Overview", roles: ["company_hr", "interviewer", "hiring_manager"] },
  { href: "/requisitions", label: "Requisitions", roles: ["company_hr", "hiring_manager"] },
  { href: "/candidates", label: "Candidates", roles: ["company_hr", "hiring_manager"] },
  { href: "/interviews", label: "Interviews", roles: ["company_hr", "interviewer", "hiring_manager"] },
  { href: "/account", label: "Account", roles: ["company_hr", "interviewer", "hiring_manager"] },
];

export function AppShell({ user, environment, children }: { user: AuthUser; environment: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const links = navigation.filter((item) => item.roles.some((role) => user.roles.includes(role as AuthUser["roles"][number])));

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return <div className="app-frame">
    <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
      <div className="brand"><span className="brand-kicker">KEMINDO</span><span>Recruitment<br />Intelligence</span></div>
      <nav aria-label="Recruitment navigation">{links.map((item) => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className={`nav-link ${pathname === item.href ? "nav-link-active" : ""}`}>{item.label}</Link>)}</nav>
      <div className="sidebar-footer"><EnvironmentBadge environment={environment} /><span>Local workspace</span></div>
    </aside>
    <div className="main-frame">
      <header className="topbar"><button className="menu-toggle" type="button" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>☰</button><div><span className="topbar-kicker">Recruitment Intelligence</span><strong>{user.fullName}</strong></div><Button variant="secondary" type="button" onClick={logout} disabled={loggingOut}>{loggingOut ? "Signing out…" : "Sign out"}</Button></header>
      {children}
    </div>
  </div>;
}
