import { createHash } from "node:crypto";

export const DEMO_COMPANY_CODE = "KEMINDO-DEMO";
export const DEMO_PASSWORD = "demo-password";

export const demoCandidates = [
  { key: "matched", name: "Alya Pratama", email: "alya.pratama@demo.kemindo.local", location: "Jakarta", skills: ["chemical handling", "production operations"], certifications: ["K3", "forklift"], stage: "interview" as const },
  { key: "missing", name: "Bima Santoso", email: "bima.santoso@demo.kemindo.local", location: "Bekasi", skills: ["production operations"], certifications: [], stage: "screening" as const },
  { key: "review", name: "Citra Lestari", email: "citra.lestari@demo.kemindo.local", location: "Tangerang", skills: ["chemical handling"], certifications: ["K3"], stage: "shortlisted" as const },
  { key: "applied", name: "Deni Wijaya", email: "deni.wijaya@demo.kemindo.local", location: "Depok", skills: ["warehouse operations"], certifications: ["forklift"], stage: "applied" as const },
  { key: "alternate", name: "Eka Sari", email: "eka.sari@demo.kemindo.local", location: "Bogor", skills: ["production operations", "chemical handling"], certifications: ["K3"], stage: "screening" as const },
] as const;

export function createDemoPdf(title: string, body: string) {
  const escape = (value: string) => value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
  const lines = [title, ...body.split("\n")].map(escape);
  const stream = ["BT", "/F1 12 Tf", "72 740 Td", ...lines.flatMap((line, index) => [index === 0 ? `(${line}) Tj` : "0 -18 Td", index === 0 ? "" : `(${line}) Tj`]), "ET"].filter(Boolean).join("\n");
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>", `<< /Length ${Buffer.byteLength(stream) + 1} >>\nstream\n${stream}\nendstream`, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`; }
  const xref = Buffer.byteLength(pdf); pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "utf8");
}

export function demoFileHash(bytes: Buffer) { return createHash("sha256").update(bytes).digest("hex"); }
