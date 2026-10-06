export type RequisitionState = "draft" | "pending_approval" | "approved" | "rejected" | "closed";
export type VacancyState = "draft" | "published" | "closed";

export class WorkflowConflictError extends Error {
  code = "INVALID_STATE_TRANSITION";
  constructor(message: string) { super(message); }
}

export function transitionRequisition(current: RequisitionState, action: "submit" | "approve" | "reject" | "reopen" | "close"): RequisitionState {
  const transitions: Record<string, RequisitionState> = {
    "draft:submit": "pending_approval",
    "pending_approval:approve": "approved",
    "pending_approval:reject": "rejected",
    "rejected:reopen": "draft",
    "approved:close": "closed",
  };
  const next = transitions[`${current}:${action}`];
  if (!next) throw new WorkflowConflictError(`Cannot ${action} requisition from ${current}.`);
  return next;
}

export function transitionVacancy(current: VacancyState, action: "publish" | "close"): VacancyState {
  const transitions: Record<string, VacancyState> = { "draft:publish": "published", "published:close": "closed" };
  const next = transitions[`${current}:${action}`];
  if (!next) throw new WorkflowConflictError(`Cannot ${action} vacancy from ${current}.`);
  return next;
}
