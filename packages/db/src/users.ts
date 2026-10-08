import {
  assignmentsFromGroups,
  parseRoleGroupMap,
  type Actor,
  type Role,
  type RoleAssignment,
} from "@vocab/core";
import { audit } from "./audit";
import { db } from "./client";
import { assertAllowed, DomainError } from "./errors";

export interface LoginProfile {
  email: string;
  name: string;
  entraOid?: string;
  /** Entra ID group object ids from the token's `groups` claim. */
  groups?: string[];
}

/**
 * Creates or refreshes a user at sign-in and syncs the roles granted by their Entra groups.
 * Manually granted roles are left alone.
 */
export async function upsertUserFromLogin(profile: LoginProfile) {
  const email = profile.email.toLowerCase();
  const map = parseRoleGroupMap(process.env.ROLE_GROUP_MAP);
  const granted = profile.groups ? assignmentsFromGroups(map, profile.groups) : null;

  return db().$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email },
      create: { email, name: profile.name, entraOid: profile.entraOid, lastLoginAt: new Date() },
      update: {
        name: profile.name,
        entraOid: profile.entraOid ?? undefined,
        lastLoginAt: new Date(),
      },
    });
    if (granted) {
      const domains = await tx.domain.findMany({ select: { id: true, key: true } });
      const domainId = new Map(domains.map((d) => [d.key, d.id]));
      await tx.roleAssignment.deleteMany({ where: { userId: user.id, source: "ENTRA" } });
      for (const a of granted) {
        const did = a.domain ? (domainId.get(a.domain) ?? null) : null;
        const exists = await tx.roleAssignment.findFirst({
          where: { userId: user.id, role: a.role, domainId: did },
        });
        if (!exists)
          await tx.roleAssignment.create({
            data: { userId: user.id, role: a.role, domainId: did, source: "ENTRA" },
          });
      }
    }
    return user;
  });
}

/** The permission subject for a user. DEFAULT_ROLE=CONTRIBUTOR lets every employee propose. */
export async function getActor(userId: string): Promise<Actor> {
  const rows = await db().roleAssignment.findMany({ where: { userId }, include: { domain: true } });
  const assignments: RoleAssignment[] = rows.map((r) => ({
    role: r.role,
    domain: r.domain?.key ?? null,
  }));
  if (process.env.DEFAULT_ROLE === "CONTRIBUTOR")
    assignments.push({ role: "CONTRIBUTOR", domain: null });
  return { id: userId, assignments };
}

export async function getUser(userId: string) {
  return db().user.findUnique({ where: { id: userId } });
}

export async function listUsersWithRoles() {
  return db().user.findMany({
    orderBy: { name: "asc" },
    include: { assignments: { include: { domain: true }, orderBy: { role: "asc" } } },
  });
}

function requireAdmin(actor: Actor) {
  assertAllowed(
    actor.assignments.some((a) => a.role === "ADMIN")
      ? { allowed: true }
      : { allowed: false, reason: "Glossary admin role required" },
  );
}

export async function grantRole(
  actor: Actor,
  input: { email: string; role: Role; domain: string | null },
) {
  requireAdmin(actor);
  return db().$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!user) throw new DomainError("NOT_FOUND", "This person has not signed in yet");
    const domain = input.domain
      ? await tx.domain.findUnique({ where: { key: input.domain } })
      : null;
    if (input.domain && !domain) throw new DomainError("INVALID", "Unknown domain");
    const existing = await tx.roleAssignment.findFirst({
      where: { userId: user.id, role: input.role, domainId: domain?.id ?? null },
    });
    if (existing) return existing;
    const created = await tx.roleAssignment.create({
      data: { userId: user.id, role: input.role, domainId: domain?.id ?? null, source: "MANUAL" },
    });
    await audit(tx, {
      actorId: actor.id,
      action: "role.grant",
      entityType: "User",
      entityId: user.id,
      details: input,
    });
    return created;
  });
}

export async function revokeRole(actor: Actor, assignmentId: string) {
  requireAdmin(actor);
  return db().$transaction(async (tx) => {
    const a = await tx.roleAssignment.findUnique({ where: { id: assignmentId } });
    if (!a) throw new DomainError("NOT_FOUND", "Role assignment not found");
    if (a.source === "ENTRA")
      throw new DomainError(
        "INVALID",
        "This role comes from an Entra ID group; change the group membership instead",
      );
    if (a.userId === actor.id && a.role === "ADMIN")
      throw new DomainError("INVALID", "You cannot remove your own admin role");
    await tx.roleAssignment.delete({ where: { id: assignmentId } });
    await audit(tx, {
      actorId: actor.id,
      action: "role.revoke",
      entityType: "User",
      entityId: a.userId,
      details: { role: a.role, domainId: a.domainId },
    });
  });
}

/** Sets a domain's default data owner and steward (shown on concept pages). */
export async function setDomainPeople(
  actor: Actor,
  domainKey: string,
  people: { ownerEmail?: string; stewardEmail?: string },
) {
  requireAdmin(actor);
  const find = async (email?: string) => {
    if (!email?.trim()) return null;
    const u = await db().user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!u) throw new DomainError("NOT_FOUND", `${email} has not signed in yet`);
    return u.id;
  };
  const [ownerId, stewardId] = await Promise.all([
    find(people.ownerEmail),
    find(people.stewardEmail),
  ]);
  return db().$transaction(async (tx) => {
    const d = await tx.domain.update({ where: { key: domainKey }, data: { ownerId, stewardId } });
    await audit(tx, {
      actorId: actor.id,
      action: "domain.people",
      entityType: "Domain",
      entityId: d.id,
      details: people,
    });
  });
}
