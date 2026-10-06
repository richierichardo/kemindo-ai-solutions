import { z } from "zod";

export const requisitionInputSchema = z.object({
  companyId: z.string().uuid(), divisionId: z.string().uuid(), siteId: z.string().uuid().nullable(), jobFamilyId: z.string().uuid(),
  title: z.string().trim().min(2).max(255), employmentType: z.enum(["permanent", "contract", "temporary", "internship"]),
  shiftRequired: z.boolean(), requiredSkills: z.array(z.string().trim().min(1).max(128)).max(30), requiredCertifications: z.array(z.string().trim().min(1).max(128)).max(30),
});

export const rejectionSchema = z.object({ reason: z.string().trim().min(2).max(2000) });

export const candidateIntakeSchema = z.object({
  fullName: z.string().trim().min(2).max(255),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(64).optional().or(z.literal("")),
  location: z.string().trim().max(255).optional().or(z.literal("")),
});

export const matchingRequestSchema = z.object({ force: z.boolean().optional().default(false) });
export const matchingChatSchema = z.object({ feature: z.literal("candidate_match"), applicationId: z.string().uuid(), force: z.boolean().optional().default(false) });
export const reviewNoteSchema = z.object({ note: z.string().trim().min(2).max(2000) });
export const interviewScheduleSchema = z.object({ interviewerId: z.string().uuid(), scheduledAt: z.string().datetime({ offset: true }) });
export const scorecardSchema = z.object({ notes: z.string().trim().max(10000).optional().or(z.literal("")), scores: z.array(z.object({ competency: z.string().trim().min(1).max(128), score: z.number().int().min(1).max(5), evidence: z.string().trim().min(2).max(3000), comment: z.string().trim().max(2000).optional().or(z.literal("")) })).min(5).max(5) });
export const decisionSchema = z.object({ decision: z.enum(["approved", "rejected", "on_hold"]), note: z.string().trim().min(2).max(2000) });
export const aiInterviewSchema = z.discriminatedUnion("feature", [
  z.object({ feature: z.literal("interview_questions"), interviewId: z.string().uuid(), force: z.boolean().optional().default(false) }),
  z.object({ feature: z.literal("interview_summary"), interviewId: z.string().uuid(), force: z.boolean().optional().default(false) }),
]);

export type RequisitionInput = z.infer<typeof requisitionInputSchema>;
