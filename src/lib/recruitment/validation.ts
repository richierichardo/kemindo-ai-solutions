import { z } from "zod";

export const requisitionInputSchema = z.object({
  companyId: z.string().uuid(), divisionId: z.string().uuid(), siteId: z.string().uuid().nullable(), jobFamilyId: z.string().uuid(),
  title: z.string().trim().min(2).max(255), employmentType: z.enum(["permanent", "contract", "temporary", "internship"]),
  shiftRequired: z.boolean(), requiredSkills: z.array(z.string().trim().min(1).max(128)).max(30), requiredCertifications: z.array(z.string().trim().min(1).max(128)).max(30),
});

export const rejectionSchema = z.object({ reason: z.string().trim().min(2).max(2000) });

export type RequisitionInput = z.infer<typeof requisitionInputSchema>;
