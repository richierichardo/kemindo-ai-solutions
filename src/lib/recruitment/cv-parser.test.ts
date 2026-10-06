import { describe, expect, it } from "vitest";
import { CvParseError, extractPdfText, parseCvText } from "./cv-parser";

const candidate = { fullName: "Fallback Name", email: "fallback@example.com", phone: null, location: null };

describe("local CV parser", () => {
  it("extracts deterministic core fields from readable text", () => {
    const parsed = parseCvText(`Alice Example\nalice@example.com\n+62 812 3456 7890\nLocation: Jakarta\n\nSkills\nTypeScript, Chemical Handling\nCertifications\nK3\nEducation\nUniversitas Kemindo 2018\nExperience\nKemindo Operator 2020 - Present\nLanguages\nEnglish, Indonesian\nAvailability: 30 days`, candidate);
    expect(parsed).toMatchObject({ fullName: "Alice Example", email: "alice@example.com", location: "Jakarta", skills: ["TypeScript", "Chemical Handling"], certifications: ["K3"], languages: ["English", "Indonesian"], availability: "30 days" });
    expect(parsed.experience[0]?.raw).toContain("Kemindo Operator");
  });

  it("fails when a PDF cannot be extracted or has no readable text", async () => {
    await expect(extractPdfText(Buffer.from("not a pdf"))).rejects.toMatchObject({ code: "PDF_EXTRACTION_FAILED" });
    expect(() => parseCvText("   ", candidate)).toThrowError(new CvParseError("NO_TEXT_CONTENT", "The PDF does not contain enough readable text to parse."));
  });
});
