import type { ParsedCvData } from "./cv-parser";

export type RequirementResult = { requirement: string; type: "skill" | "certification"; matched: boolean; evidence: string | null };
export type HardRequirementCheck = { allSkillsMet: boolean; allCertificationsMet: boolean; hardRequirementsMet: boolean; skills: RequirementResult[]; certifications: RequirementResult[] };

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function check(requirements: string[], values: string[], type: "skill" | "certification"): RequirementResult[] {
  const normalizedValues = values.map((value) => ({ value, normalized: normalize(value) }));
  return requirements.map((requirement) => {
    const normalizedRequirement = normalize(requirement);
    const match = normalizedValues.find((value) => value.normalized === normalizedRequirement);
    return { requirement, type, matched: Boolean(match), evidence: match?.value ?? null };
  });
}

export function checkHardRequirements(requiredSkills: string[], requiredCertifications: string[], parsed: ParsedCvData): HardRequirementCheck {
  const skills = check(requiredSkills, parsed.skills, "skill");
  const certifications = check(requiredCertifications, parsed.certifications, "certification");
  const allSkillsMet = skills.every((result) => result.matched);
  const allCertificationsMet = certifications.every((result) => result.matched);
  return { allSkillsMet, allCertificationsMet, hardRequirementsMet: allSkillsMet && allCertificationsMet, skills, certifications };
}
