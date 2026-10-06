
export type EducationEntry = { raw: string; institution: string; degree: string | null; field: string | null; startYear: string | null; endYear: string | null };
export type ExperienceEntry = { raw: string; employer: string | null; title: string | null; startDate: string | null; endDate: string | null; description: string | null };
export type ParsedCvData = {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  skills: string[];
  certifications: string[];
  education: EducationEntry[];
  experience: ExperienceEntry[];
  languages: string[];
  availability: string | null;
};

export class CvParseError extends Error {
  constructor(public code: "PDF_EXTRACTION_FAILED" | "NO_TEXT_CONTENT", message: string) { super(message); }
}

function clean(value: string) {
  return value.replace(/\s+/g, " ").replace(/^[•*\-–—]+\s*/, "").trim();
}

function linesOf(text: string) {
  return text.split(/\r?\n/).map(clean).filter(Boolean);
}

function heading(value: string) {
  return value.toLowerCase().replace(/[^a-z]/g, "").trim();
}

function sectionLines(lines: string[], names: string[]) {
  const wanted = new Set(names.map(heading));
  const start = lines.findIndex((line) => wanted.has(heading(line)));
  if (start < 0) return [];
  const result: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.length <= 80 && ["skills", "technicalskills", "certifications", "certificates", "education", "experience", "workexperience", "employment", "languages", "availability"].includes(heading(line.split(":")[0]))) break;
    result.push(line);
  }
  return result;
}

function listFromSection(lines: string[], labels: string[]) {
  const result = sectionLines(lines, labels).flatMap((line) => line.split(/[,;|]/).map(clean)).filter(Boolean);
  return [...new Set(result)];
}

function valueAfterLabel(lines: string[], labels: string[]) {
  const pattern = new RegExp(`^(?:${labels.join("|")})\\s*:\\s*(.+)$`, "i");
  return lines.map((line) => line.match(pattern)?.[1]).find(Boolean) ?? null;
}

function parseEducation(lines: string[]): EducationEntry[] {
  return sectionLines(lines, ["education"]).map((raw) => {
    const years = raw.match(/\b(19|20)\d{2}\b/g) ?? [];
    return { raw, institution: raw, degree: null, field: null, startYear: years[0] ?? null, endYear: years[1] ?? null };
  });
}

function parseExperience(lines: string[]): ExperienceEntry[] {
  return sectionLines(lines, ["experience", "work experience", "employment"]).map((raw) => {
    const range = raw.match(/\b(19|20)\d{2}\b\s*(?:-|–|—|to)\s*(present|\b(19|20)\d{2}\b)/i);
    return { raw, employer: null, title: raw.replace(range?.[0] ?? "", "").trim() || null, startDate: range?.[0]?.split(/-|–|—|to/i)[0]?.trim() ?? null, endDate: range?.[2] ? range[2].trim() : range?.[1]?.toLowerCase() === "present" ? "present" : null, description: null };
  });
}

type CandidateFields = { fullName: string; email: string; phone: string | null; location: string | null };

export function parseCvText(text: string, candidate: CandidateFields): ParsedCvData {
  const lines = linesOf(text);
  if (lines.join(" ").length < 20) throw new CvParseError("NO_TEXT_CONTENT", "The PDF does not contain enough readable text to parse.");
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? candidate.email;
  const phone = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() ?? candidate.phone;
  const fullName = valueAfterLabel(lines, ["name", "full name"]) ?? (lines.find((line) => !line.includes("@") && !/^\+?[\d\s().-]+$/.test(line) && line.length <= 80) ?? candidate.fullName);
  const location = valueAfterLabel(lines, ["location", "address"]) ?? candidate.location;
  const certifications = listFromSection(lines, ["certifications", "certificates"]);
  const skills = listFromSection(lines, ["skills", "technical skills"]);
  const languages = listFromSection(lines, ["languages"]);
  const availability = valueAfterLabel(lines, ["availability", "notice period"]);
  return { fullName, email, phone, location, skills, certifications, education: parseEducation(lines), experience: parseExperience(lines), languages, availability };
}

export async function extractPdfText(bytes: Buffer) {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const document = await pdfjs.getDocument({ data: new Uint8Array(bytes), useWorkerFetch: false, isEvalSupported: false }).promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => "str" in item ? item.str : "").join(" "));
    }
    const text = pages.join("\n").replace(/\s+/g, " ").trim();
    if (text.length < 20) throw new CvParseError("NO_TEXT_CONTENT", "The PDF does not contain enough readable text to parse.");
    return text;
  } catch (error) {
    if (error instanceof CvParseError) throw error;
    throw new CvParseError("PDF_EXTRACTION_FAILED", "The PDF could not be read. Replace the file or retry parsing.");
  }
}
