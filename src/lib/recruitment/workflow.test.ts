import { describe, expect, it } from "vitest";
import { transitionRequisition, transitionVacancy, WorkflowConflictError } from "./workflow";

describe("requisition and vacancy workflow", () => {
  it("supports the happy-path requisition lifecycle", () => {
    expect(transitionRequisition("draft", "submit")).toBe("pending_approval");
    expect(transitionRequisition("pending_approval", "approve")).toBe("approved");
    expect(transitionRequisition("approved", "close")).toBe("closed");
  });

  it("supports rejection and HR reopening", () => {
    expect(transitionRequisition("pending_approval", "reject")).toBe("rejected");
    expect(transitionRequisition("rejected", "reopen")).toBe("draft");
  });

  it("rejects invalid requisition and vacancy transitions", () => {
    expect(() => transitionRequisition("draft", "approve")).toThrow(WorkflowConflictError);
    expect(() => transitionVacancy("draft", "close")).toThrow(WorkflowConflictError);
    expect(transitionVacancy("draft", "publish")).toBe("published");
    expect(transitionVacancy("published", "close")).toBe("closed");
  });
});
