"use server";

import {
  CHANGE_ACTIONS,
  ROLE,
  type ChangeAction,
  type Role,
  type ValidationIssue,
} from "@vocab/core";
import {
  addComment,
  certifyConcept,
  createChange,
  DomainError,
  grantRole,
  importRows,
  performAction,
  readXlsx,
  rebaseChange,
  revokeRole,
  setDomainPeople,
  updateChange,
  type ImportReport,
} from "@vocab/db";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { LOCALE_COOKIE } from "@/lib/i18n";
import { requireUser } from "@/lib/session";

export interface ActionState {
  ok?: boolean;
  message?: string;
  issues?: ValidationIssue[];
  report?: ImportReport;
}

/** Turns expected business errors into form state; anything else is a real failure. */
async function attempt(fn: () => Promise<ActionState | void>): Promise<ActionState> {
  try {
    return (await fn()) ?? { ok: true };
  } catch (e) {
    if (e instanceof DomainError) {
      return {
        ok: false,
        message: e.message,
        issues: Array.isArray(e.details) ? (e.details as ValidationIssue[]) : undefined,
      };
    }
    throw e;
  }
}

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "");

export async function setLocaleAction(fd: FormData) {
  const locale = str(fd, "locale") === "en" ? "en" : "lv";
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/signin" });
}

export async function entraSignInAction() {
  await signIn("microsoft-entra-id", { redirectTo: "/" });
}

export async function devSignInAction(fd: FormData) {
  await signIn("dev", { email: str(fd, "email"), redirectTo: "/" });
}

/** Creates a change request (new concept or edit) or saves an existing draft. */
export async function saveChangeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { actor } = await requireUser();
  let number: number | undefined;
  let payload: unknown;
  try {
    payload = JSON.parse(str(fd, "payload"));
  } catch {
    return { ok: false, message: "Invalid form data" };
  }
  const reason = str(fd, "reason");
  const changeId = str(fd, "changeId");
  const state = await attempt(async () => {
    if (changeId) {
      await updateChange(actor, changeId, { payload, reason });
    } else {
      const slug = str(fd, "slug");
      const change = await createChange(actor, {
        kind: slug ? "UPDATE" : "CREATE",
        slug: slug || undefined,
        payload,
        reason,
      });
      number = change.number;
    }
  });
  if (!state.ok) return state;
  const target = number ?? Number(str(fd, "changeNumber"));
  redirect(`/changes/${target}`);
}

export async function deprecateAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { actor } = await requireUser();
  let number = 0;
  const state = await attempt(async () => {
    const change = await createChange(actor, {
      kind: "DEPRECATE",
      slug: str(fd, "slug"),
      replacedBy: str(fd, "replacedBy").trim() || undefined,
      reason: str(fd, "reason"),
    });
    number = change.number;
  });
  if (!state.ok) return state;
  redirect(`/changes/${number}`);
}

export async function workflowAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { actor } = await requireUser();
  const action = str(fd, "action") as ChangeAction;
  if (!CHANGE_ACTIONS.includes(action)) return { ok: false, message: "Unknown action" };
  const state = await attempt(() =>
    performAction(actor, str(fd, "changeId"), action, str(fd, "comment")).then(() => undefined),
  );
  revalidatePath("/", "layout");
  return state;
}

export async function rebaseAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { actor } = await requireUser();
  const state = await attempt(() => rebaseChange(actor, str(fd, "changeId")));
  revalidatePath(`/changes/${str(fd, "changeNumber")}`);
  return state;
}

export async function certifyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { actor } = await requireUser();
  const slug = str(fd, "slug");
  const state = await attempt(() =>
    certifyConcept(actor, slug, str(fd, "note")).then(() => undefined),
  );
  revalidatePath(`/concepts/${slug}`);
  return state;
}

export async function commentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { actor } = await requireUser();
  const slug = str(fd, "slug");
  const changeId = str(fd, "changeId");
  const state = await attempt(() =>
    addComment(actor, slug ? { conceptSlug: slug } : { changeId }, str(fd, "body")).then(
      () => undefined,
    ),
  );
  revalidatePath(str(fd, "path") || "/");
  return state;
}

export async function grantRoleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { actor } = await requireUser();
  const role = str(fd, "role") as Role;
  if (!ROLE.values.includes(role)) return { ok: false, message: "Unknown role" };
  const state = await attempt(() =>
    grantRole(actor, { email: str(fd, "email"), role, domain: str(fd, "domain") || null }).then(
      () => undefined,
    ),
  );
  revalidatePath("/admin");
  return state;
}

export async function revokeRoleAction(fd: FormData) {
  const { actor } = await requireUser();
  await revokeRole(actor, str(fd, "assignmentId"));
  revalidatePath("/admin");
}

export async function domainPeopleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { actor } = await requireUser();
  const state = await attempt(() =>
    setDomainPeople(actor, str(fd, "domain"), {
      ownerEmail: str(fd, "ownerEmail"),
      stewardEmail: str(fd, "stewardEmail"),
    }).then(() => undefined),
  );
  revalidatePath("/admin");
  return state;
}

export async function importAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { actor } = await requireUser();
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, message: "Choose an .xlsx file" };
  if (file.size > 10 * 1024 * 1024) return { ok: false, message: "File is larger than 10 MB" };
  return attempt(async () => {
    const rows = await readXlsx(await file.arrayBuffer());
    const report = await importRows(actor, rows);
    revalidatePath("/", "layout");
    return { ok: true, report };
  });
}
