import {
  buildSearchText,
  canCertify,
  normalizeForSearch,
  parseConceptDoc,
  referencedSlugs,
  reviewDueDate,
  type Actor,
  type ConceptDoc,
  type ConceptStatus,
  type ConceptType,
} from "@vocab/core";
import { audit } from "./audit";
import { db } from "./client";
import { assertAllowed, DomainError } from "./errors";
import { Prisma } from "./generated/prisma/client";

type Tx = Prisma.TransactionClient;

export interface WriteOptions {
  status: ConceptStatus;
  authorId?: string | null;
  approvedById?: string | null;
  changeRequestId?: string | null;
  note?: string;
  /** Seed/import write all concepts first and link them in a second pass. */
  skipLinks?: boolean;
  now?: Date;
}

/**
 * Writes a concept document: the concept row, derived columns, metric details, links and an
 * immutable revision. The single write path used by seed, import, change approval and certification.
 */
export async function writeConcept(tx: Tx, doc: ConceptDoc, opts: WriteOptions) {
  const now = opts.now ?? new Date();
  const domain = await tx.domain.findUnique({ where: { key: doc.domain } });
  if (!domain) throw new DomainError("INVALID", `Unknown domain ${doc.domain}`);

  const existing = await tx.concept.findUnique({ where: { slug: doc.slug } });
  const { labelText, fullText } = buildSearchText(doc);
  const approval =
    opts.status === "APPROVED"
      ? { approvedAt: now, approvedBy: opts.approvedById ?? null, reviewDueAt: reviewDueDate(now) }
      : opts.status === "CANDIDATE"
        ? { approvedAt: null, approvedBy: null, reviewDueAt: null }
        : {};
  const data = {
    type: doc.type,
    status: opts.status,
    domainId: domain.id,
    doc: doc as unknown as Prisma.InputJsonValue,
    preferredLv: doc.labels.lv.preferred,
    preferredEn: doc.labels.en.preferred,
    labelText,
    fullText,
    ...approval,
  };
  const concept = existing
    ? await tx.concept.update({
        where: { id: existing.id },
        data: { ...data, revision: existing.revision + 1 },
      })
    : await tx.concept.create({ data: { ...data, slug: doc.slug, revision: 1 } });

  if (doc.metric) {
    const m = doc.metric;
    const metric = {
      unit: m.unit,
      aggregation: m.aggregation,
      additivity: m.additivity,
      polarity: m.polarity,
      reinsuranceBasis: m.qualifiers.reinsuranceBasis,
      premiumBasis: m.qualifiers.premiumBasis,
      timeBasis: m.qualifiers.timeBasis,
      accountingBasis: m.qualifiers.accountingBasis,
      refreshFrequency: m.refreshFrequency ?? null,
      powerBiDataset: m.powerBi?.dataset ?? null,
      powerBiMeasure: m.powerBi?.measure ?? null,
      hasDax: Boolean(m.dax),
      hasReferenceSql: Boolean(m.referenceSql),
    };
    await tx.metric.upsert({
      where: { conceptId: concept.id },
      create: { conceptId: concept.id, ...metric },
      update: metric,
    });
  } else {
    await tx.metric.deleteMany({ where: { conceptId: concept.id } });
  }

  if (!opts.skipLinks) await syncLinks(tx, concept.id, doc);

  await tx.revision.create({
    data: {
      conceptId: concept.id,
      number: concept.revision,
      doc: doc as unknown as Prisma.InputJsonValue,
      status: opts.status,
      note: opts.note,
      changeRequestId: opts.changeRequestId ?? null,
      authorId: opts.authorId ?? null,
      approvedById: opts.approvedById ?? null,
    },
  });
  return concept;
}

/** Resolves a document's slugs; throws if any are missing or a component is not a metric. */
export async function resolveReferences(tx: Tx, doc: ConceptDoc) {
  const slugs = referencedSlugs(doc);
  const found = await tx.concept.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true, type: true },
  });
  const bySlug = new Map(found.map((c) => [c.slug, c]));
  const missing = slugs.filter((s) => !bySlug.has(s));
  if (missing.length)
    throw new DomainError("INVALID", `Unknown concepts referenced: ${missing.join(", ")}`);
  const notMetrics = (doc.metric?.components ?? []).filter(
    (c) => bySlug.get(c.metric)?.type !== "METRIC",
  );
  if (notMetrics.length) {
    throw new DomainError(
      "INVALID",
      `Components must be metrics: ${notMetrics.map((c) => c.metric).join(", ")}`,
    );
  }
  return bySlug;
}

/** Rebuilds the relation and component rows from the document. */
export async function syncLinks(tx: Tx, conceptId: string, doc: ConceptDoc) {
  const bySlug = await resolveReferences(tx, doc);
  await tx.conceptRelation.deleteMany({ where: { fromId: conceptId } });
  await tx.metricComponent.deleteMany({ where: { metricId: conceptId } });
  if (doc.relations.length) {
    await tx.conceptRelation.createMany({
      data: doc.relations.map((r) => ({
        fromId: conceptId,
        toId: bySlug.get(r.target)!.id,
        type: r.type,
      })),
      skipDuplicates: true,
    });
  }
  const components = doc.metric?.components ?? [];
  if (components.length) {
    await tx.metricComponent.createMany({
      data: components.map((c) => ({
        metricId: conceptId,
        componentId: bySlug.get(c.metric)!.id,
        role: c.role,
      })),
      skipDuplicates: true,
    });
  }
}

/** Reads the stored document, re-validated so callers always get defaults applied. */
export function readDoc(json: unknown): ConceptDoc {
  const r = parseConceptDoc(json);
  if (!r.ok) throw new Error(`Stored concept document is invalid: ${JSON.stringify(r.issues)}`);
  return r.doc;
}

const listSelect = {
  id: true,
  slug: true,
  type: true,
  status: true,
  preferredLv: true,
  preferredEn: true,
  doc: true,
  reviewDueAt: true,
  updatedAt: true,
  domain: { select: { key: true } },
} satisfies Prisma.ConceptSelect;

export type ConceptListItem = Prisma.ConceptGetPayload<{ select: typeof listSelect }>;

export interface ListFilter {
  domain?: string;
  type?: ConceptType;
  status?: ConceptStatus;
  /** First letter of the preferred label in the given language. */
  letter?: string;
  lang?: "lv" | "en";
  reviewOverdue?: boolean;
  take?: number;
}

export async function listConcepts(filter: ListFilter = {}): Promise<ConceptListItem[]> {
  const labelField = filter.lang === "lv" ? "preferredLv" : "preferredEn";
  return db().concept.findMany({
    where: {
      domain: filter.domain ? { key: filter.domain } : undefined,
      type: filter.type,
      status: filter.status,
      [labelField]: filter.letter ? { startsWith: filter.letter, mode: "insensitive" } : undefined,
      reviewDueAt: filter.reviewOverdue ? { lt: new Date() } : undefined,
    },
    orderBy: { [labelField]: "asc" },
    take: filter.take ?? 1000,
    select: listSelect,
  });
}

export async function getConcept(slug: string) {
  const concept = await db().concept.findUnique({
    where: { slug },
    include: {
      domain: { include: { owner: true, steward: true } },
      metric: true,
      relationsFrom: {
        include: {
          to: {
            select: { slug: true, preferredLv: true, preferredEn: true, type: true, status: true },
          },
        },
      },
      relationsTo: {
        include: {
          from: {
            select: { slug: true, preferredLv: true, preferredEn: true, type: true, status: true },
          },
        },
      },
      components: {
        include: { component: { select: { slug: true, preferredLv: true, preferredEn: true } } },
      },
      usedIn: {
        include: { metric: { select: { slug: true, preferredLv: true, preferredEn: true } } },
      },
      revisions: {
        orderBy: { number: "desc" },
        select: {
          number: true,
          status: true,
          note: true,
          createdAt: true,
          authorId: true,
          approvedById: true,
          changeRequestId: true,
        },
      },
      changes: {
        where: { status: { in: ["DRAFT", "SUBMITTED", "ENDORSED", "CHANGES_REQUESTED"] } },
        select: { id: true, number: true, kind: true, status: true, authorId: true },
      },
    },
  });
  if (!concept) return null;
  return { ...concept, doc: readDoc(concept.doc) };
}

export async function getRevision(slug: string, number: number) {
  const revision = await db().revision.findFirst({
    where: { number, concept: { slug } },
  });
  return revision && { ...revision, doc: readDoc(revision.doc) };
}

export interface SearchHit {
  slug: string;
  type: ConceptType;
  status: ConceptStatus;
  preferredLv: string;
  preferredEn: string;
  domain: string;
  definition: { lv: string; en: string };
  score: number;
}

/**
 * Ranked, diacritics-insensitive search over labels (weighted) and full text, with trigram
 * similarity for typos. Exact label or abbreviation matches rank first.
 */
export async function searchConcepts(
  query: string,
  opts: { domain?: string; type?: ConceptType; limit?: number } = {},
): Promise<SearchHit[]> {
  const q = normalizeForSearch(query);
  if (!q) return [];
  const like = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
  const exact = `% | ${q.replace(/[\\%_]/g, (m) => `\\${m}`)} |%`;
  const domainFilter = opts.domain ? Prisma.sql`AND d.key = ${opts.domain}` : Prisma.empty;
  const typeFilter = opts.type
    ? Prisma.sql`AND c.type = ${opts.type}::"ConceptType"`
    : Prisma.empty;
  const rows = await db().$queryRaw<SearchHit[]>`
    SELECT c.slug, c.type::text AS type, c.status::text AS status, c."preferredLv", c."preferredEn",
           d.key AS domain, c.doc->'definition' AS definition,
           (CASE WHEN (' | ' || c."labelText" || ' |') LIKE ${exact} THEN 3 ELSE 0 END
            + CASE WHEN c."labelText" LIKE ${like} THEN 2 ELSE 0 END
            + word_similarity(${q}, c."labelText")
            + CASE WHEN c."fullText" LIKE ${like} THEN 0.5 ELSE 0 END
            - CASE WHEN c.status = 'DEPRECATED' THEN 1 ELSE 0 END)::float AS score
    FROM "Concept" c JOIN "Domain" d ON d.id = c."domainId"
    WHERE (c."fullText" LIKE ${like} OR word_similarity(${q}, c."labelText") > 0.45)
      ${domainFilter} ${typeFilter}
    ORDER BY score DESC, c."preferredEn" ASC
    LIMIT ${opts.limit ?? 50}`;
  return rows;
}

/** Owner confirms a candidate (or re-confirms an approved concept at its yearly review). */
export async function certifyConcept(actor: Actor, slug: string, note?: string) {
  return db().$transaction(async (tx) => {
    const concept = await tx.concept.findUnique({ where: { slug }, include: { domain: true } });
    if (!concept) throw new DomainError("NOT_FOUND", `No concept ${slug}`);
    if (concept.status === "DEPRECATED")
      throw new DomainError("INVALID", "Deprecated concepts cannot be certified");
    assertAllowed(canCertify(actor, concept.domain.key));
    const doc = readDoc(concept.doc);
    const recertify = concept.status === "APPROVED";
    const updated = await writeConcept(tx, doc, {
      status: "APPROVED",
      authorId: actor.id,
      approvedById: actor.id,
      note: note?.trim() || (recertify ? "Recertified" : "Certified"),
    });
    await audit(tx, {
      actorId: actor.id,
      action: recertify ? "concept.recertify" : "concept.certify",
      entityType: "Concept",
      entityId: concept.id,
      details: { slug, note },
    });
    return updated;
  });
}

/** Display names for user ids referenced on revisions and reviews. */
export async function userNames(ids: (string | null | undefined)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (!unique.length) return new Map();
  const users = await db().user.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true },
  });
  return new Map(users.map((u) => [u.id, u.name]));
}

export async function domainSummaries() {
  const [domains, counts] = await Promise.all([
    db().domain.findMany({ orderBy: { order: "asc" }, include: { owner: true, steward: true } }),
    db().concept.groupBy({ by: ["domainId", "type", "status"], _count: { _all: true } }),
  ]);
  return domains.map((d) => {
    const mine = counts.filter((c) => c.domainId === d.id);
    const sum = (pred: (c: (typeof mine)[number]) => boolean) =>
      mine.filter(pred).reduce((n, c) => n + c._count._all, 0);
    return {
      ...d,
      terms: sum((c) => c.type === "TERM" && c.status !== "DEPRECATED"),
      metrics: sum((c) => c.type === "METRIC" && c.status !== "DEPRECATED"),
      approved: sum((c) => c.status === "APPROVED"),
      candidates: sum((c) => c.status === "CANDIDATE"),
    };
  });
}

export async function recentRevisions(take = 10) {
  return db().revision.findMany({
    orderBy: { createdAt: "desc" },
    take,
    select: {
      number: true,
      note: true,
      status: true,
      createdAt: true,
      authorId: true,
      concept: { select: { slug: true, preferredLv: true, preferredEn: true } },
    },
  });
}

export async function allSlugs() {
  return db().concept.findMany({
    select: { slug: true, type: true, preferredLv: true, preferredEn: true },
    orderBy: { slug: "asc" },
  });
}
