import type { ChangeStatus } from "./vocab";

/**
 * Change-request lifecycle (plan §2 workflow):
 * Draft → Submitted → (Endorsed by steward) → Approved by owner, with
 * "changes requested", rejection and withdrawal as side exits.
 */
export const CHANGE_ACTIONS = [
  "submit",
  "withdraw",
  "endorse",
  "requestChanges",
  "approve",
  "reject",
] as const;
export type ChangeAction = (typeof CHANGE_ACTIONS)[number];

const TRANSITIONS: Record<ChangeAction, { from: readonly ChangeStatus[]; to: ChangeStatus }> = {
  submit: { from: ["DRAFT", "CHANGES_REQUESTED"], to: "SUBMITTED" },
  withdraw: { from: ["DRAFT", "SUBMITTED", "ENDORSED", "CHANGES_REQUESTED"], to: "WITHDRAWN" },
  endorse: { from: ["SUBMITTED"], to: "ENDORSED" },
  requestChanges: { from: ["SUBMITTED", "ENDORSED"], to: "CHANGES_REQUESTED" },
  approve: { from: ["SUBMITTED", "ENDORSED"], to: "APPROVED" },
  reject: { from: ["SUBMITTED", "ENDORSED"], to: "REJECTED" },
};

export function nextStatus(status: ChangeStatus, action: ChangeAction): ChangeStatus | null {
  const t = TRANSITIONS[action];
  return t.from.includes(status) ? t.to : null;
}

export function isEditable(status: ChangeStatus): boolean {
  return status === "DRAFT" || status === "CHANGES_REQUESTED";
}

export function isOpen(status: ChangeStatus): boolean {
  return !["APPROVED", "REJECTED", "WITHDRAWN"].includes(status);
}

/** Owners recertify approved concepts once a year (plan §5). */
export const RECERTIFICATION_MONTHS = 12;

export function reviewDueDate(from: Date): Date {
  const due = new Date(from);
  due.setMonth(due.getMonth() + RECERTIFICATION_MONTHS);
  return due;
}
