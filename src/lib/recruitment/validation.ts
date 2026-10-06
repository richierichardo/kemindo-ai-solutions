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

export type RequisitionInput = z.infer<typeof requisitionInputSchema>;
