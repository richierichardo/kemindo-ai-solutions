import { describe, expect, it } from "vitest";
import { checkHardRequirements } from "./requirements";

describe("hard requirement checks", () => {
  it("matches normalized exact skill and certification phrases", () => {
    const result = checkHardRequirements(["TypeScript", "Chemical Handling"], ["K3"], {
      fullName: "A", email: "a@example.com", phone: null, location: null, skills: ["typescript", "Chemical-Handling"], certifications: ["K3"], education: [], experience: [], languages: [], availability: null,
    });
    expect(result.hardRequirementsMet).toBe(true);
    expect(result.skills.every((item) => item.matched)).toBe(true);
  });

  it("does not treat partial tokens or synonyms as an exact match", () => {
    const result = checkHardRequirements(["Java"], ["Forklift Operator"], {
      fullName: "A", email: "a@example.com", phone: null, location: null, skills: ["JavaScript"], certifications: ["Forklift"], education: [], experience: [], languages: [], availability: null,
    });
    expect(result.hardRequirementsMet).toBe(false);
    expect(result.skills[0]).toMatchObject({ matched: false, evidence: null });
    expect(result.certifications[0]).toMatchObject({ matched: false, evidence: null });
  });
});
