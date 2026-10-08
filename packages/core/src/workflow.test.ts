import { describe, expect, it } from "vitest";
import {
  availableActions,
  canCertify,
  canEditChange,
  canPerform,
  canProposeChange,
  type Actor,
} from "./permissions";
import { isEditable, nextStatus, reviewDueDate } from "./workflow";

const author: Actor = { id: "a", assignments: [{ role: "CONTRIBUTOR", domain: "claims" }] };
const steward: Actor = { id: "s", assignments: [{ role: "STEWARD", domain: "claims" }] };
const owner: Actor = { id: "o", assignments: [{ role: "OWNER", domain: "claims" }] };
const otherOwner: Actor = { id: "x", assignments: [{ role: "OWNER", domain: "premium" }] };
const admin: Actor = { id: "adm", assignments: [{ role: "ADMIN", domain: null }] };
const viewer: Actor = { id: "v", assignments: [] };

const change = (status: any, domains = ["claims"]) => ({ authorId: "a", status, domains });

describe("workflow state machine", () => {
  it("follows the happy path", () => {
    expect(nextStatus("DRAFT", "submit")).toBe("SUBMITTED");
    expect(nextStatus("SUBMITTED", "endorse")).toBe("ENDORSED");
    expect(nextStatus("ENDORSED", "approve")).toBe("APPROVED");
  });

  it("lets owners approve without a steward endorsement", () => {
    expect(nextStatus("SUBMITTED", "approve")).toBe("APPROVED");
  });

  it("blocks transitions out of final states", () => {
    for (const s of ["APPROVED", "REJECTED", "WITHDRAWN"] as const) {
      for (const a of ["submit", "approve", "withdraw", "endorse"] as const) {
        expect(nextStatus(s, a)).toBeNull();
      }
    }
  });

  it("allows editing only drafts and returned changes", () => {
    expect(isEditable("DRAFT")).toBe(true);
    expect(isEditable("CHANGES_REQUESTED")).toBe(true);
    expect(isEditable("SUBMITTED")).toBe(false);
  });

  it("sets recertification a year ahead", () => {
    expect(reviewDueDate(new Date("2026-10-08T00:00:00Z")).toISOString()).toBe(
      "2027-10-08T00:00:00.000Z",
    );
  });
});

describe("permissions", () => {
  it("requires contributor rank to propose", () => {
    expect(canProposeChange(viewer, "claims").allowed).toBe(false);
    expect(canProposeChange(author, "claims").allowed).toBe(true);
    expect(canProposeChange(author, "premium").allowed).toBe(false);
  });

  it("enforces the four-eyes rule even for admins", () => {
    const own = { authorId: "adm", status: "SUBMITTED" as const, domains: ["claims"] };
    expect(canPerform(admin, "approve", own).allowed).toBe(false);
    expect(canPerform(admin, "approve", change("SUBMITTED")).allowed).toBe(true);
  });

  it("lets stewards endorse but not approve", () => {
    expect(canPerform(steward, "endorse", change("SUBMITTED")).allowed).toBe(true);
    expect(canPerform(steward, "approve", change("SUBMITTED")).allowed).toBe(false);
    expect(canPerform(owner, "approve", change("ENDORSED")).allowed).toBe(true);
  });

  it("scopes roles to their domain", () => {
    expect(canPerform(otherOwner, "approve", change("SUBMITTED")).allowed).toBe(false);
    expect(canCertify(otherOwner, "claims").allowed).toBe(false);
    expect(canCertify(owner, "claims").allowed).toBe(true);
  });

  it("requires rank in every touched domain when a concept moves", () => {
    expect(canPerform(owner, "approve", change("SUBMITTED", ["claims", "premium"])).allowed).toBe(
      false,
    );
  });

  it("only the author edits and submits", () => {
    expect(canEditChange(author, change("DRAFT")).allowed).toBe(true);
    expect(canEditChange(steward, change("DRAFT")).allowed).toBe(false);
    expect(canEditChange(author, change("SUBMITTED")).allowed).toBe(false);
    expect(availableActions(author, change("DRAFT"))).toEqual(["submit", "withdraw"]);
    expect(availableActions(owner, change("SUBMITTED"))).toEqual([
      "endorse",
      "approve",
      "requestChanges",
      "reject",
    ]);
  });
});
