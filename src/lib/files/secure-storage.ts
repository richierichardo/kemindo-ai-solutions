import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { getServerEnv } from "../env";

export const MAX_CV_BYTES = 10 * 1024 * 1024;
const PDF_SIGNATURE = Buffer.from("%PDF-");

export class FileSecurityError extends Error {
  constructor(public status: 413 | 415 | 422, public code: string, message: string) {
    super(message);
  }
}

function storageRoot() {
  return path.resolve(getServerEnv().STORAGE_ROOT);
}

function safeRelativePath(relativePath: string) {
  const root = storageRoot();
  const absolute = path.resolve(root, relativePath);
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new FileSecurityError(422, "INVALID_STORAGE_PATH", "The requested file path is invalid.");
  }
  return { absolute, relative: relative.split(path.sep).join("/") };
}

export function normalizeOriginalFilename(filename: string) {
  if (!filename || filename.includes("\0") || filename.includes("/") || filename.includes("\\") || filename === "." || filename === "..") {
    throw new FileSecurityError(422, "INVALID_FILENAME", "The uploaded filename is invalid.");
  }
  const normalized = filename.trim().replace(/[^a-zA-Z0-9._-]/g, "_");
  if (!normalized.toLowerCase().endsWith(".pdf")) {
    throw new FileSecurityError(415, "UNSUPPORTED_FILE_TYPE", "Only PDF CV files are supported.");
  }
  return normalized.slice(0, 255);
}

export async function inspectPdf(file: File) {
  const originalFilename = normalizeOriginalFilename(file.name);
  if (file.type !== "application/pdf") {
    throw new FileSecurityError(415, "UNSUPPORTED_FILE_TYPE", "Only PDF CV files are supported.");
  }
  if (file.size <= 0) throw new FileSecurityError(415, "EMPTY_FILE", "The uploaded CV is empty.");
  if (file.size > MAX_CV_BYTES) throw new FileSecurityError(413, "FILE_TOO_LARGE", "The CV must be 10 MB or smaller.");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!bytes.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE)) {
    throw new FileSecurityError(415, "INVALID_PDF", "The uploaded file is not a valid PDF signature.");
  }
  return { originalFilename, bytes, sha256: createHash("sha256").update(bytes).digest("hex") };
}

export async function writeCandidatePdf(candidateId: string, documentId: string, bytes: Buffer) {
  const relativePath = `uploads/candidates/${candidateId}/${documentId}.pdf`;
  const target = safeRelativePath(relativePath);
  const temporary = `${target.absolute}.tmp-${randomUUID()}`;
  await mkdir(path.dirname(target.absolute), { recursive: true });
  try {
    await writeFile(temporary, bytes, { flag: "wx" });
    await rename(temporary, target.absolute);
    return target.relative;
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

export async function readPrivateStorageFile(relativePath: string) {
  const target = safeRelativePath(relativePath);
  return readFile(target.absolute);
}

export async function removePrivateStorageFile(relativePath: string) {
  const target = safeRelativePath(relativePath);
  await rm(target.absolute, { force: true });
}
