import { z } from "zod";
import { DOMAIN_KEYS } from "./domains";
import type { RoleAssignment } from "./permissions";
import { ROLE } from "./vocab";

/**
 * Entra ID group → role mapping, configured as JSON in ROLE_GROUP_MAP, e.g.
 * {"<group-object-id>": {"role": "OWNER", "domain": "claims"}}. A null domain means all domains.
 */
const entrySchema = z.object({
  role: z.enum(ROLE.values),
  domain: z
    .enum(DOMAIN_KEYS as [string, ...string[]])
    .nullable()
    .default(null),
});
const mapSchema = z.record(z.string().min(1), z.union([entrySchema, z.array(entrySchema)]));

export type RoleGroupMap = Record<string, RoleAssignment[]>;

export function parseRoleGroupMap(json: string | undefined): RoleGroupMap {
  if (!json?.trim()) return {};
  const parsed = mapSchema.parse(JSON.parse(json));
  return Object.fromEntries(
    Object.entries(parsed).map(([group, v]) => [group, Array.isArray(v) ? v : [v]]),
  );
}

/** Assignments granted by a user's group memberships, de-duplicated. */
export function assignmentsFromGroups(
  map: RoleGroupMap,
  groups: readonly string[],
): RoleAssignment[] {
  const seen = new Map<string, RoleAssignment>();
  for (const g of groups) {
    for (const a of map[g] ?? []) seen.set(`${a.role}|${a.domain ?? "*"}`, a);
  }
  return [...seen.values()];
}
