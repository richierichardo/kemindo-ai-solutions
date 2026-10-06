import { beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FileSecurityError, inspectPdf, normalizeOriginalFilename, readPrivateStorageFile, removePrivateStorageFile, writeCandidatePdf } from "./secure-storage";

beforeEach(() => {
  process.env.APP_ENV = "test";
  process.env.AUTH_SESSION_SECRET = "test-session-secret-with-at-least-32-characters";
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
  process.env.DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
  process.env.DEEPSEEK_MODEL = "deepseek-flash";
  process.env.DEEPSEEK_API_KEY = "test-key";
  process.env.STORAGE_ROOT = "./storage";
});

describe("secure CV storage validation", () => {
  it("normalizes a safe PDF filename and rejects traversal", () => {
    expect(normalizeOriginalFilename("resume final.pdf")).toBe("resume_final.pdf");
    expect(() => normalizeOriginalFilename("../resume.pdf")).toThrow(FileSecurityError);
    expect(() => normalizeOriginalFilename("resume.docx")).toThrow(FileSecurityError);
  });

  it("accepts a PDF signature and rejects a spoofed or oversized file", async () => {
    const valid = new File([Buffer.from("%PDF-1.7 demo")], "resume.pdf", { type: "application/pdf" });
    await expect(inspectPdf(valid)).resolves.toMatchObject({ originalFilename: "resume.pdf", sha256: expect.any(String) });
    const spoofed = new File([Buffer.from("not a pdf")], "resume.pdf", { type: "application/pdf" });
    await expect(inspectPdf(spoofed)).rejects.toMatchObject({ code: "INVALID_PDF", status: 415 });
    const wrongMime = new File([Buffer.from("%PDF-1.7 demo")], "resume.pdf", { type: "text/plain" });
    await expect(inspectPdf(wrongMime)).rejects.toMatchObject({ code: "UNSUPPORTED_FILE_TYPE", status: 415 });
  });

  it("writes and removes only generated paths below the storage root", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "kemindo-storage-"));
    process.env.STORAGE_ROOT = root;
    const relativePath = await writeCandidatePdf("candidate-1", "document-1", Buffer.from("%PDF-1.7 demo"));
    expect(relativePath).toBe("uploads/candidates/candidate-1/document-1.pdf");
    await expect(readPrivateStorageFile(relativePath)).resolves.toEqual(Buffer.from("%PDF-1.7 demo"));
    await removePrivateStorageFile(relativePath);
    await rm(root, { recursive: true, force: true });
  });
});
