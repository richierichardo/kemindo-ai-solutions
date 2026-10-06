import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { generateMatchingExplanation, matchingInputHash, type MatchingContext } from "./deepseek";

const context: MatchingContext = { jobTitle: "Operator", jobDescription: "Operate production equipment", requiredSkills: ["chemical handling"], requiredCertifications: ["K3"], candidate: { location: "Jakarta", skills: ["chemical handling"], certifications: ["K3"], education: [], experience: [{ raw: "Operator" }], languages: ["Indonesian"], availability: "30 days" } };

beforeEach(() => {
  process.env.APP_ENV = "test"; process.env.AUTH_SESSION_SECRET = "test-session-secret-with-at-least-32-characters";
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test"; process.env.DEEPSEEK_API_URL = "https://deepseek.test/chat/completions";
  process.env.DEEPSEEK_MODEL = "deepseek-flash"; process.env.DEEPSEEK_API_KEY = "test-secret-key"; process.env.STORAGE_ROOT = "./storage";
});

afterEach(() => vi.unstubAllGlobals());

describe("DeepSeek matching adapter", () => {
  it("sends a server-side JSON request and validates the response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ score: 82, summary: "Strong operational fit.", strengths: ["Chemical handling"], gaps: [], evidence: [{ category: "skill", claim: "Chemical handling", evidence: "Parsed skill" }] }) } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(generateMatchingExplanation(context)).resolves.toMatchObject({ output: { score: 82 } });
    const requestBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    expect(requestBody.model).toBe("deepseek-flash");
    expect(requestBody.messages[1].content).not.toContain("test-secret-key");
    expect(requestBody.messages[1].content).not.toContain("alice@example.com");
  });

  it("rejects malformed provider output and produces stable context hashes", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "not json" } }] }), { status: 200 })));
    await expect(generateMatchingExplanation(context)).rejects.toMatchObject({ message: "DeepSeek returned invalid matching output." });
    expect(matchingInputHash(context)).toBe(matchingInputHash(structuredClone(context)));
  });
});
