import {
  canEditChange,
  canPerform,
  canProposeChange,
  isOpen,
  nextStatus,
  parseConceptDoc,
  rankIn,
  type Actor,
  type ChangeAction,
  type ChangeKind,
  type ChangeStatus,
  type ConceptDoc,
} from "@vocab/core";
import { audit } from "./audit";
import { db } from "./client";
import { readDoc, resolveReferences, writeConcept } from "./concepts";
import { assertAllowed, DomainError } from "./errors";
import type { Prisma } from "./generated/prisma/client";

function validDoc(payload: unknown): ConceptDoc {
  const r = parseConceptDoc(payload);
  if (!r.ok) throw new DomainError("INVALID", "The concept has validation errors", r.issues);
  return r.doc;
}

const json = (doc: ConceptDoc) => doc as unknown as Prisma.InputJsonValue;

export interface NewChange {
  kind: ChangeKind;
  /** Existing concept for UPDATE / DEPRECATE. */
  slug?: string;
  /** Full concept document for CREATE / UPDATE. */
  payload?: unknown;
  /** DEPRECATE: optional replacement concept. */
  replacedBy?: string;
  reason: string;
}

/** Opens a change request as a draft. Approved content changes only through these. */
export async function createChange(actor: Actor, input: NewChange) {
  const reason = input.reason.trim();
  if (!reason) throw new DomainError("INVALID", "Please explain the reason for the change");

  return db().$transaction(async (tx) => {
    let doc: ConceptDoc;
    let concept: {
      id: string;
      revision: number;
      status: string;
      slug: string;
      domain: { key: string };
    } | null = null;

    if (input.kind === "CREATE") {
      doc = validDoc(input.payload);
      if (await tx.concept.findUnique({ where: { slug: doc.slug } })) {
        throw new DomainError("CONFLICT", `A concept with id "${doc.slug}" already exists`);
      }
    } else {
      concept = await tx.concept.findUnique({
        where: { slug: input.slug ?? "" },
        include: { domain: true },
      });
      if (!concept) throw new DomainError("NOT_FOUND", `No concept ${input.slug}`);
      if (concept.status === "DEPRECATED")
        throw new DomainError("INVALID", "This concept is deprecated");
      if (input.kind === "UPDATE") {
        doc = validDoc(input.payload);
        if (doc.slug !== concept.slug)
          throw new DomainError("INVALID", "The concept id cannot be changed");
      } else {
        doc = readDoc((await tx.concept.findUniqueOrThrow({ where: { id: concept.id } })).doc);
        if (input.replacedBy) {
          doc = {
            ...doc,
            relations: [
              ...doc.relations.filter((r) => r.type !== "REPLACED_BY"),
              { type: "REPLACED_BY", target: input.replacedBy },
            ],
          };
          doc = validDoc(doc);
        }
      }
      assertAllowed(canProposeChange(actor, concept.domain.key));
    }
    assertAllowed(canProposeChange(actor, doc.domain));

    const domain = await tx.domain.findUniqueOrThrow({ where: { key: doc.domain } });
    const change = await tx.changeRequest.create({
      data: {
        kind: input.kind,
        slug: doc.slug,
        conceptId: concept?.id ?? null,
        domainId: domain.id,
        payload: json(doc),
        baseRevision: concept?.revision ?? null,
        reason,
        authorId: actor.id,
      },
    });
    await audit(tx, {
      actorId: actor.id,
      action: "change.create",
      entityType: "ChangeRequest",
      entityId: change.id,
      details: { kind: input.kind, slug: doc.slug },
    });
    return change;
  });
}

async function loadContext(tx: Prisma.TransactionClient, id: string) {
  const change = await tx.changeRequest.findUnique({
    where: { id },
    include: { domain: true, concept: { include: { domain: true } } },
  });
  if (!change) throw new DomainError("NOT_FOUND", "Change request not found");
  const domains = [change.domain.key];
  if (change.concept && change.concept.domain.key !== change.domain.key)
    domains.push(change.concept.domain.key);
  return {
    change,
    ctx: { authorId: change.authorId, status: change.status as ChangeStatus, domains },
  };
}

export async function updateChange(
  actor: Actor,
  id: string,
  input: { payload: unknown; reason: string },
) {
  return db().$transaction(async (tx) => {
    const { change, ctx } = await loadContext(tx, id);
    assertAllowed(canEditChange(actor, ctx));
    if (change.kind === "DEPRECATE")
      throw new DomainError("INVALID", "A deprecation has no content to edit");
    const doc = validDoc(input.payload);
    if (doc.slug !== change.slug)
      throw new DomainError("INVALID", "The concept id cannot be changed");
    if (change.kind === "CREATE" && (await tx.concept.findUnique({ where: { slug: doc.slug } }))) {
      throw new DomainError("CONFLICT", `A concept with id "${doc.slug}" already exists`);
    }
    assertAllowed(canProposeChange(actor, doc.domain));
    const domain = await tx.domain.findUniqueOrThrow({ where: { key: doc.domain } });
    const reason = input.reason.trim() || change.reason;
    await tx.changeRequest.update({
      where: { id },
      data: { payload: json(doc), domainId: domain.id, reason },
    });
    await audit(tx, {
      actorId: actor.id,
      action: "change.edit",
      entityType: "ChangeRequest",
      entityId: id,
    });
  });
}

/** Moves an UPDATE onto the concept's latest revision after someone else changed it. */
export async function rebaseChange(actor: Actor, id: string) {
  return db().$transaction(async (tx) => {
    const { change, ctx } = await loadContext(tx, id);
    assertAllowed(canEditChange(actor, ctx));
    if (!change.concept)
      throw new DomainError("INVALID", "Only changes to existing concepts can be rebased");
    await tx.changeRequest.update({
      where: { id },
      data: { baseRevision: change.concept.revision },
    });
    await audit(tx, {
      actorId: actor.id,
      action: "change.rebase",
      entityType: "ChangeRequest",
      entityId: id,
      details: { to: change.concept.revision },
    });
  });
}

const COMMENT_REQUIRED: ChangeAction[] = ["requestChanges", "reject"];

/** Runs a workflow action. Approval applies the change to the glossary in the same transaction. */
export async function performAction(
  actor: Actor,
  id: string,
  action: ChangeAction,
  comment?: string,
) {
  const note = comment?.trim() || undefined;
  if (COMMENT_REQUIRED.includes(action) && !note) {
    throw new DomainError("INVALID", "Please add a comment explaining what needs to change");
  }
  return db().$transaction(async (tx) => {
    const { change, ctx } = await loadContext(tx, id);
    assertAllowed(canPerform(actor, action, ctx));
    const to = nextStatus(ctx.status, action)!;
    const doc = readDoc(change.payload);
    const now = new Date();

    if (action === "submit") await resolveReferences(tx, doc);

    let conceptId = change.conceptId;
    if (action === "approve") {
      if (change.kind === "CREATE") {
        if (await tx.concept.findUnique({ where: { slug: doc.slug } })) {
          throw new DomainError(
            "CONFLICT",
            `A concept with id "${doc.slug}" was created meanwhile`,
          );
        }
      } else if (change.concept!.revision !== change.baseRevision) {
        throw new DomainError(
          "CONFLICT",
          `The concept changed (revision ${change.baseRevision} → ${change.concept!.revision}) after this request was written. Ask the author to rebase it.`,
        );
      }
      const concept = await writeConcept(tx, doc, {
        status: change.kind === "DEPRECATE" ? "DEPRECATED" : "APPROVED",
        authorId: change.authorId,
        approvedById: actor.id,
        changeRequestId: change.id,
        note: `#${change.number}: ${change.reason}`,
        now,
      });
      conceptId = concept.id;
    }

    await tx.changeRequest.update({
      where: { id },
      data: {
        status: to,
        conceptId,
        submittedAt: action === "submit" ? now : undefined,
        decidedAt: action === "approve" || action === "reject" ? now : undefined,
        decidedById: action === "approve" || action === "reject" ? actor.id : undefined,
      },
    });
    await tx.review.create({
      data: {
        changeRequestId: id,
        actorId: actor.id,
        action,
        fromStatus: ctx.status,
        toStatus: to,
        comment: note,
      },
    });
    await audit(tx, {
      actorId: actor.id,
      action: `change.${action}`,
      entityType: "ChangeRequest",
      entityId: id,
      details: { from: ctx.status, to },
    });
    return to;
  });
}

export async function getChange(id: string) {
  const change = await db().changeRequest.findUnique({
    where: { id },
    include: {
      domain: true,
      author: true,
      decidedBy: true,
      concept: {
        select: {
          slug: true,
          revision: true,
          doc: true,
          status: true,
          domain: { select: { key: true } },
        },
      },
      reviews: { orderBy: { createdAt: "asc" }, include: { actor: true } },
    },
  });
  if (!change) return null;
  return {
    ...change,
    doc: readDoc(change.payload),
    currentDoc: change.concept ? readDoc(change.concept.doc) : null,
  };
}

export async function getChangeByNumber(number: number) {
  const c = await db().changeRequest.findUnique({ where: { number }, select: { id: true } });
  return c ? getChange(c.id) : null;
}

export interface ChangeFilter {
  status?: ChangeStatus;
  openOnly?: boolean;
  authorId?: string;
  /** Open changes this actor may review (steward+ in the domain, not the author). */
  reviewableBy?: Actor;
  slug?: string;
  take?: number;
}

export async function listChanges(filter: ChangeFilter = {}) {
  const changes = await db().changeRequest.findMany({
    where: {
      status: filter.reviewableBy
        ? { in: ["SUBMITTED", "ENDORSED"] }
        : filter.openOnly
          ? { in: ["DRAFT", "SUBMITTED", "ENDORSED", "CHANGES_REQUESTED"] }
          : filter.status,
      authorId: filter.authorId,
      slug: filter.slug,
    },
    orderBy: { updatedAt: "desc" },
    take: filter.take ?? 200,
    include: { domain: true, author: true },
  });
  const reviewer = filter.reviewableBy;
  if (!reviewer) return changes;
  return changes.filter((c) => c.authorId !== reviewer.id && rankIn(reviewer, c.domain.key) >= 2);
}

export { isOpen };
