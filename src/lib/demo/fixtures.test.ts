import { describe, expect, it } from "vitest";
import { createDemoPdf, demoCandidates, demoFileHash } from "./fixtures";

describe("recruitment demo fixtures", () => {
  it("creates five deterministic candidate records and valid PDF signatures", () => {
    expect(demoCandidates).toHaveLength(5);
    const first = createDemoPdf("Demo CV", "Skills: chemical handling");
    expect(first.subarray(0, 5).toString()).toBe("%PDF-");
    expect(demoFileHash(first)).toBe(demoFileHash(createDemoPdf("Demo CV", "Skills: chemical handling")));
  });
});
