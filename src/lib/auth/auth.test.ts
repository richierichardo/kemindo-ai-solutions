import { beforeEach, describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";
import { createSessionValue, readSessionValue } from "./session";
import { canCompleteInterview, canDecideHiring, canManageCandidates } from "./permissions";

beforeEach(() => {
  process.env.APP_ENV = "test";
  process.env.AUTH_SESSION_SECRET = "test-session-secret-with-at-least-32-characters";
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
  process.env.DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
  process.env.DEEPSEEK_MODEL = "deepseek-flash";
  process.env.DEEPSEEK_API_KEY = "test-key";
  process.env.STORAGE_ROOT = "./storage";
});

describe("recruitment auth primitives", () => {
  it("hashes and verifies passwords without storing the plaintext", async () => {
    const hash = await hashPassword("demo-password");
    expect(hash).toMatch(/^scrypt\$/);
    expect(hash).not.toContain("demo-password");
    await expect(verifyPassword("demo-password", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("accepts a signed unexpired session and rejects tampering or expiry", () => {
    const value = createSessionValue("user-123", 1000);
    expect(readSessionValue(value, 1001)).toBe("user-123");
    expect(readSessionValue(`${value}tampered`, 1001)).toBeNull();
    expect(readSessionValue(value, 1000 + 60 * 60 * 8 + 1)).toBeNull();
  });

  it("keeps recruitment permissions separated by role", () => {
    expect(canManageCandidates(["company_hr"])).toBe(true);
    expect(canManageCandidates(["interviewer"])).toBe(false);
    expect(canCompleteInterview(["interviewer"])).toBe(true);
    expect(canDecideHiring(["hiring_manager"])).toBe(true);
    expect(canDecideHiring(["company_hr"])).toBe(false);
  });
});
