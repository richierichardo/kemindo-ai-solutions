import { createHash } from "node:crypto";
import { z } from "zod";
import { getServerEnv } from "../env";

export const MATCHING_PROMPT_VERSION = "candidate-match-v1";

export const matchingOutputSchema = z.object({
  score: z.number().int().min(0).max(100),
  summary: z.string().trim().min(1).max(3000),
  strengths: z.array(z.string().trim().min(1).max(500)).max(10),
  gaps: z.array(z.string().trim().min(1).max(500)).max(10),
  evidence: z.array(z.object({ category: z.string().trim().min(1).max(128), claim: z.string().trim().min(1).max(500), evidence: z.string().trim().min(1).max(1000) })).max(20),
});

export type MatchingOutput = z.infer<typeof matchingOutputSchema>;
export type MatchingContext = {
  jobTitle: string;
  jobDescription: string;
  requiredSkills: string[];
  requiredCertifications: string[];
  candidate: { location: string | null; skills: string[]; certifications: string[]; education: unknown[]; experience: unknown[]; languages: string[]; availability: string | null };
};

export class DeepSeekProviderError extends Error {
  constructor(message: string) { super(message); }
}

export function matchingInputHash(context: MatchingContext) {
  return createHash("sha256").update(JSON.stringify({ promptVersion: MATCHING_PROMPT_VERSION, context })).digest("hex");
}

function parseContent(content: unknown) {
  if (typeof content !== "string") throw new DeepSeekProviderError("DeepSeek returned no matching content.");
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return matchingOutputSchema.parse(JSON.parse(cleaned)); } catch { throw new DeepSeekProviderError("DeepSeek returned invalid matching output."); }
}

export async function generateMatchingExplanation(context: MatchingContext): Promise<{ output: MatchingOutput; latencyMs: number }> {
  const env = getServerEnv();
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(env.DEEPSEEK_API_URL, {
      method: "POST", signal: controller.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${env.DEEPSEEK_API_KEY}` },
      body: JSON.stringify({ model: env.DEEPSEEK_MODEL, temperature: 0, response_format: { type: "json_object" }, messages: [
        { role: "system", content: `You are a recruitment evidence assistant. Prompt version: ${MATCHING_PROMPT_VERSION}. Return JSON only using the requested schema. Score soft fit from 0 to 100. Never make a hiring decision, never use protected attributes, and do not invent evidence.` },
        { role: "user", content: JSON.stringify(context) },
      ] }),
    });
    if (!response.ok) throw new DeepSeekProviderError(`DeepSeek request failed with status ${response.status}.`);
    const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
    return { output: parseContent(payload.choices?.[0]?.message?.content), latencyMs: Date.now() - startedAt };
  } catch (error) {
    if (error instanceof DeepSeekProviderError) throw error;
    throw new DeepSeekProviderError("DeepSeek is unavailable. Retry matching later.");
  } finally {
    clearTimeout(timeout);
  }
}
