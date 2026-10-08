import type { Actor } from "@vocab/core";
import { audit } from "./audit";
import { db } from "./client";
import { DomainError } from "./errors";

/** Any signed-in user may comment on a concept or a change request. */
export async function addComment(
  actor: Actor,
  target: { conceptSlug?: string; changeId?: string },
  body: string,
) {
  const text = body.trim();
  if (!text) throw new DomainError("INVALID", "Comment is empty");
  if (text.length > 5000)
    throw new DomainError("INVALID", "Comment is too long (max 5000 characters)");
  return db().$transaction(async (tx) => {
    let conceptId: string | null = null;
    if (target.conceptSlug) {
      const c = await tx.concept.findUnique({
        where: { slug: target.conceptSlug },
        select: { id: true },
      });
      if (!c) throw new DomainError("NOT_FOUND", "Concept not found");
      conceptId = c.id;
    }
    const comment = await tx.comment.create({
      data: { authorId: actor.id, body: text, conceptId, changeRequestId: target.changeId ?? null },
    });
    await audit(tx, {
      actorId: actor.id,
      action: "comment.add",
      entityType: "Comment",
      entityId: comment.id,
    });
    return comment;
  });
}

export async function listComments(target: { conceptSlug?: string; changeId?: string }) {
  return db().comment.findMany({
    where: target.conceptSlug
      ? { concept: { slug: target.conceptSlug } }
      : { changeRequestId: target.changeId },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { name: true } } },
  });
}
