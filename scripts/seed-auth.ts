import { config as loadEnv } from "dotenv";
import { eq } from "drizzle-orm";
import { getDb } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import { getServerEnv } from "../src/lib/env";
import { companies, divisions, jobFamilies, roles, sites, userRoles, users } from "../src/db/schema";

loadEnv({ path: ".env.local" });
loadEnv();

const DEMO_PASSWORD = "demo-password";
const demoUsers = [
  { email: "hr.demo@kemindo.local", fullName: "Demo Company HR", role: "company_hr" },
  { email: "interviewer.demo@kemindo.local", fullName: "Demo Interviewer", role: "interviewer" },
  { email: "hiring.manager.demo@kemindo.local", fullName: "Demo Hiring Manager", role: "hiring_manager" },
] as const;

async function main() {
  const env = getServerEnv();
  if (!["demo", "development"].includes(env.APP_ENV)) throw new Error("Auth demo seed requires APP_ENV=demo or APP_ENV=development.");

  const db = getDb();
  const company = await db.insert(companies).values({ code: "KEMINDO-DEMO", name: "PT Kemindo Demo", legalName: "PT Kemindo Demo", status: "active" }).onConflictDoUpdate({ target: companies.code, set: { name: "PT Kemindo Demo", updatedAt: new Date() } }).returning({ id: companies.id }).then((rows) => rows[0]);
  if (!company) throw new Error("Unable to seed demo company.");
  const division = await db.insert(divisions).values({ companyId: company.id, code: "RECRUITMENT", name: "Recruitment Intelligence", businessArea: "factory" }).onConflictDoUpdate({ target: [divisions.companyId, divisions.code], set: { name: "Recruitment Intelligence", updatedAt: new Date() } }).returning({ id: divisions.id }).then((rows) => rows[0]);
  const site = await db.insert(sites).values({ companyId: company.id, code: "DEMO-SITE", name: "Kemindo Demo Site", location: "Indonesia", timezone: "Asia/Jakarta", siteType: "factory" }).onConflictDoUpdate({ target: [sites.companyId, sites.code], set: { name: "Kemindo Demo Site", updatedAt: new Date() } }).returning({ id: sites.id }).then((rows) => rows[0]);
  await db.insert(jobFamilies).values({ code: "OPERATIONS", name: "Operations", description: "Demo recruitment job family" }).onConflictDoUpdate({ target: jobFamilies.code, set: { name: "Operations", updatedAt: new Date() } });

  const roleRows = await Promise.all(demoUsers.map(async ({ role }) => db.insert(roles).values({ code: role, name: role.replaceAll("_", " ") }).onConflictDoUpdate({ target: roles.code, set: { name: role.replaceAll("_", " "), updatedAt: new Date() } }).returning({ id: roles.id, code: roles.code }).then((rows) => rows[0])));
  for (const demoUser of demoUsers) {
    const role = roleRows.find((row) => row?.code === demoUser.role);
    if (!role) throw new Error(`Unable to seed role ${demoUser.role}.`);
    const passwordHash = await hashPassword(DEMO_PASSWORD);
    const user = await db.insert(users).values({ companyId: company.id, siteId: site.id, email: demoUser.email, fullName: demoUser.fullName, passwordHash, isActive: true }).onConflictDoUpdate({ target: users.email, set: { companyId: company.id, siteId: site.id, fullName: demoUser.fullName, passwordHash, isActive: true, updatedAt: new Date() } }).returning({ id: users.id }).then((rows) => rows[0]);
    if (!user) throw new Error(`Unable to seed user ${demoUser.email}.`);
    await db.insert(userRoles).values({ userId: user.id, roleId: role.id }).onConflictDoNothing();
  }

  const userCount = await db.select({ id: users.id }).from(users).where(eq(users.companyId, company.id));
  console.log(`Seeded demo recruitment auth: ${userCount.length} users. Password: ${DEMO_PASSWORD}`);
  void division;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
