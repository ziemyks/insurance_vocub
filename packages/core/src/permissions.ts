import { nextStatus, type ChangeAction } from "./workflow";
import type { ChangeStatus, Role } from "./vocab";

/**
 * Role-based access (plan §2). A role is held either globally (domain = null) or for one
 * domain. Ranks are cumulative: an owner can do everything a steward can. Admins are global.
 * Four-eyes rule: nobody endorses, approves or rejects their own change — not even admins.
 */
export interface RoleAssignment {
  role: Role;
  domain: string | null;
}

export interface Actor {
  id: string;
  assignments: RoleAssignment[];
}

const RANK: Record<Exclude<Role, "ADMIN">, number> = {
  VIEWER: 0,
  CONTRIBUTOR: 1,
  STEWARD: 2,
  OWNER: 3,
};
const ADMIN_RANK = 4;

export type Decision = { allowed: true } | { allowed: false; reason: string };
const allow: Decision = { allowed: true };
const deny = (reason: string): Decision => ({ allowed: false, reason });

export function isAdmin(actor: Actor): boolean {
  return actor.assignments.some((a) => a.role === "ADMIN");
}

/** Highest rank the actor holds in a domain, counting global assignments. Everyone is a viewer. */
export function rankIn(actor: Actor, domain: string): number {
  if (isAdmin(actor)) return ADMIN_RANK;
  return actor.assignments
    .filter((a) => a.domain === null || a.domain === domain)
    .reduce((max, a) => Math.max(max, RANK[a.role as keyof typeof RANK] ?? 0), 0);
}

function hasRank(actor: Actor, domains: readonly string[], role: keyof typeof RANK) {
  return domains.every((d) => rankIn(actor, d) >= RANK[role]);
}

export function canProposeChange(actor: Actor, domain: string): Decision {
  return hasRank(actor, [domain], "CONTRIBUTOR")
    ? allow
    : deny("Contributor role required in this domain");
}

/** Owners (or admins) certify candidate concepts, deprecate and recertify. */
export function canCertify(actor: Actor, domain: string): Decision {
  return hasRank(actor, [domain], "OWNER")
    ? allow
    : deny("Data owner role required in this domain");
}

export interface ChangeContext {
  authorId: string;
  status: ChangeStatus;
  /** Domains touched: the target domain, plus the current one when a concept moves domain. */
  domains: readonly string[];
}

export function canEditChange(actor: Actor, change: ChangeContext): Decision {
  if (change.status !== "DRAFT" && change.status !== "CHANGES_REQUESTED") {
    return deny("Only drafts and returned changes can be edited");
  }
  if (actor.id === change.authorId || isAdmin(actor)) return allow;
  return deny("Only the author can edit this change");
}

export function canPerform(actor: Actor, action: ChangeAction, change: ChangeContext): Decision {
  if (!nextStatus(change.status, action))
    return deny(`Cannot ${action} a change in status ${change.status}`);
  const isAuthor = actor.id === change.authorId;
  switch (action) {
    case "submit":
      return isAuthor ? allow : deny("Only the author can submit");
    case "withdraw":
      return isAuthor || isAdmin(actor) ? allow : deny("Only the author can withdraw");
    case "endorse":
    case "requestChanges":
      if (isAuthor) return deny("You cannot review your own change");
      return hasRank(actor, change.domains, "STEWARD") ? allow : deny("Data steward role required");
    case "approve":
    case "reject":
      if (isAuthor) return deny("You cannot approve or reject your own change");
      return hasRank(actor, change.domains, "OWNER") ? allow : deny("Data owner role required");
  }
}

/** Actions to offer in the UI for this actor and change. */
export function availableActions(actor: Actor, change: ChangeContext): ChangeAction[] {
  const all: ChangeAction[] = [
    "submit",
    "endorse",
    "approve",
    "requestChanges",
    "reject",
    "withdraw",
  ];
  return all.filter((a) => canPerform(actor, a, change).allowed);
}
