import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getServerEnv } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth/user";

export const dynamic = "force-dynamic";

export default async function RecruitmentLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <AppShell user={user} environment={getServerEnv().APP_ENV}>{children}</AppShell>;
}
