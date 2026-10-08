/**
 * Integration tests against a real Postgres. Run with TEST_DATABASE_URL pointing at a migrated,
 * seeded database (see README: "npm run test:db"). Skipped otherwise.
 */
import { beforeAll, describe, expect, it } from "vitest";
import type { Actor, ConceptDocInput } from "@vocab/core";

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
if (url) process.env.DATABASE_URL = url;

type Db = typeof import("./index");
let m: Db;
const actors: Record<string, Actor> = {};

async function actorFor(email: string): Promise<Actor> {
  const user = await m.db().user.findUniqueOrThrow({ where: { email } });
  return m.getActor(user.id);
}

const uniq = () => Math.random().toString(36).slice(2, 8);
const term = (slug: string): ConceptDocInput => ({
  slug,
  type: "TERM",
  domain: "claims",
  labels: {
    lv: { preferred: `Testa jēdziens ${slug}` },
    en: { preferred: `Test concept ${slug}` },
  },
  definition: { lv: "Jēdziens automātiskajiem testiem.", en: "A concept used by automated tests." },
  relations: [{ type: "RELATED", target: "claim" }],
});

suite("database services", () => {
  beforeAll(async () => {
    m = await import("./index");
    for (const [k, email] of Object.entries({
      admin: "admin@demo.local",
      owner: "owner.claims@demo.local",
      steward: "steward.claims@demo.local",
      contributor: "contributor@demo.local",
      viewer: "viewer@demo.local",
      financeOwner: "owner.finance@demo.local",
    })) {
      actors[k] = await actorFor(email);
    }
  });

  it("searches without diacritics, with typos and by abbreviation", async () => {
    const a = await m.searchConcepts("zaudējumu");
    const b = await m.searchConcepts("ZAUDEJUMU");
    expect(a.length).toBeGreaterThan(0);
    expect(b.map((h) => h.slug)).toEqual(a.map((h) => h.slug));
    expect((await m.searchConcepts("GWP"))[0]?.slug).toBe("gross-written-premium");
    expect((await m.searchConcepts("combined ratoi")).map((h) => h.slug)).toContain(
      "combined-ratio",
    );
    expect(await m.searchConcepts("   ")).toEqual([]);
    expect(await m.searchConcepts("100%_")).toEqual([]);
  });

  it("runs a new concept through review and approval with the four-eyes rule", async () => {
    const slug = `test-term-${uniq()}`;
    await expect(
      m.createChange(actors.viewer!, { kind: "CREATE", payload: term(slug), reason: "test" }),
    ).rejects.toThrow(/Contributor/);

    const change = await m.createChange(actors.contributor!, {
      kind: "CREATE",
      payload: term(slug),
      reason: "New term for tests",
    });
    await expect(m.performAction(actors.steward!, change.id, "endorse")).rejects.toThrow();
    expect(await m.performAction(actors.contributor!, change.id, "submit")).toBe("SUBMITTED");
    await expect(m.performAction(actors.contributor!, change.id, "approve")).rejects.toThrow(
      /own change/,
    );
    await expect(m.performAction(actors.financeOwner!, change.id, "approve")).rejects.toThrow(
      /owner/,
    );
    await expect(m.performAction(actors.steward!, change.id, "requestChanges")).rejects.toThrow(
      /comment/,
    );
    expect(await m.performAction(actors.steward!, change.id, "endorse", "Looks right")).toBe(
      "ENDORSED",
    );
    expect(await m.performAction(actors.owner!, change.id, "approve")).toBe("APPROVED");

    const concept = await m.getConcept(slug);
    expect(concept?.status).toBe("APPROVED");
    expect(concept?.revision).toBe(1);
    expect(concept?.reviewDueAt).toBeInstanceOf(Date);
    expect(concept?.relationsFrom.map((r) => r.to.slug)).toEqual(["claim"]);
    expect((await m.getChange(change.id))?.reviews.map((r) => r.action)).toEqual([
      "submit",
      "endorse",
      "approve",
    ]);
  });

  it("rejects stale updates until the author rebases", async () => {
    const slug = `test-term-${uniq()}`;
    const create = await m.createChange(actors.contributor!, {
      kind: "CREATE",
      payload: term(slug),
      reason: "setup",
    });
    await m.performAction(actors.contributor!, create.id, "submit");
    await m.performAction(actors.owner!, create.id, "approve");

    const edit = (en: string) => ({
      ...term(slug),
      definition: { lv: "Atjaunināta definīcija.", en },
    });
    const first = await m.createChange(actors.contributor!, {
      kind: "UPDATE",
      slug,
      payload: edit("First edit."),
      reason: "first",
    });
    const second = await m.createChange(actors.contributor!, {
      kind: "UPDATE",
      slug,
      payload: edit("Second edit."),
      reason: "second",
    });
    for (const c of [first, second]) await m.performAction(actors.contributor!, c.id, "submit");
    await m.performAction(actors.owner!, first.id, "approve");
    await expect(m.performAction(actors.owner!, second.id, "approve")).rejects.toThrow(/rebase/);

    await m.performAction(
      actors.owner!,
      second.id,
      "requestChanges",
      "Please rebase onto the latest version",
    );
    await m.rebaseChange(actors.contributor!, second.id);
    await m.performAction(actors.contributor!, second.id, "submit");
    await m.performAction(actors.owner!, second.id, "approve");
    const concept = await m.getConcept(slug);
    expect(concept?.revision).toBe(3);
    expect(concept?.doc.definition.en).toBe("Second edit.");
  });

  it("deprecates with a replacement and keeps the history", async () => {
    const [oldSlug, newSlug] = [`test-old-${uniq()}`, `test-new-${uniq()}`];
    for (const s of [oldSlug, newSlug]) {
      const c = await m.createChange(actors.contributor!, {
        kind: "CREATE",
        payload: term(s),
        reason: "setup",
      });
      await m.performAction(actors.contributor!, c.id, "submit");
      await m.performAction(actors.owner!, c.id, "approve");
    }
    const dep = await m.createChange(actors.contributor!, {
      kind: "DEPRECATE",
      slug: oldSlug,
      replacedBy: newSlug,
      reason: "Merged",
    });
    await m.performAction(actors.contributor!, dep.id, "submit");
    await m.performAction(actors.owner!, dep.id, "approve");
    const concept = await m.getConcept(oldSlug);
    expect(concept?.status).toBe("DEPRECATED");
    expect(concept?.relationsFrom.find((r) => r.type === "REPLACED_BY")?.to.slug).toBe(newSlug);
    expect(concept?.revisions.map((r) => r.number)).toEqual([2, 1]);
  });

  it("lets only domain owners certify candidates", async () => {
    await expect(m.certifyConcept(actors.financeOwner!, "claim-handler")).rejects.toThrow(/owner/);
    const c = await m.certifyConcept(actors.owner!, "claim-handler", "Checked with claims team");
    expect(c.status).toBe("APPROVED");
  });

  it("refuses to modify revisions and the audit log", async () => {
    const rev = await m.db().revision.findFirstOrThrow();
    await expect(
      m.db().revision.update({ where: { id: rev.id }, data: { note: "tampered" } }),
    ).rejects.toThrow(/append-only/);
    const log = await m.db().auditLog.findFirstOrThrow();
    await expect(m.db().auditLog.delete({ where: { id: log.id } })).rejects.toThrow(/append-only/);
  });

  it("round-trips the glossary through Excel and skips existing concepts on import", async () => {
    const items = await m.exportDocs();
    const xlsx = await m.toXlsx(items.slice(0, 5));
    const rows = await m.readXlsx(
      xlsx.buffer.slice(xlsx.byteOffset, xlsx.byteOffset + xlsx.byteLength) as ArrayBuffer,
    );
    expect(rows).toHaveLength(5);
    const slug = `test-import-${uniq()}`;
    const report = await m.importRows(actors.admin!, [
      ...rows,
      { ...rows[0]!, slug },
      { slug: "Bad Slug" },
    ]);
    expect(report.created).toEqual([slug]);
    expect(report.skipped).toHaveLength(5);
    expect(report.invalid).toHaveLength(1);
    expect((await m.getConcept(slug))?.status).toBe("CANDIDATE");
    await expect(m.importRows(actors.owner!, rows)).rejects.toThrow(/admin/);
  });
});
