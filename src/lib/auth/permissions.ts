export const RECRUITMENT_ROLES = ["company_hr", "interviewer", "hiring_manager"] as const;
export type RecruitmentRole = (typeof RECRUITMENT_ROLES)[number];

export function hasRole(userRoles: string[], role: RecruitmentRole): boolean {
  return userRoles.includes(role);
}

export function canManageCandidates(userRoles: string[]): boolean {
  return hasRole(userRoles, "company_hr");
}

export function canCompleteInterview(userRoles: string[]): boolean {
  return hasRole(userRoles, "interviewer");
}

export function canDecideHiring(userRoles: string[]): boolean {
  return hasRole(userRoles, "hiring_manager");
}
