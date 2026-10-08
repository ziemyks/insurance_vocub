import {
  canProposeChange,
  docToRow,
  isAdmin,
  rowToDoc,
  TABULAR_COLUMNS,
  type Actor,
  type ConceptDoc,
  type TabularRow,
} from "@vocab/core";
import ExcelJS from "exceljs";
import { audit } from "./audit";
import { db } from "./client";
import { readDoc, syncLinks, writeConcept } from "./concepts";
import { assertAllowed, DomainError } from "./errors";

/** All concepts with their status, in a stable order, for export. */
export async function exportDocs() {
  const rows = await db().concept.findMany({
    orderBy: [{ domainId: "asc" }, { slug: "asc" }],
    select: { doc: true, status: true, revision: true, approvedAt: true },
  });
  return rows.map((r) => ({
    doc: readDoc(r.doc),
    status: r.status,
    revision: r.revision,
    approvedAt: r.approvedAt,
  }));
}

function csvCell(value: string): string {
  return /[",\n\r;]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/** UTF-8 CSV with BOM so Excel shows Latvian characters correctly. */
export function toCsv(items: { doc: ConceptDoc; status: string }[]): string {
  const lines = [TABULAR_COLUMNS.join(",")];
  for (const { doc, status } of items) {
    const row = docToRow(doc, status);
    lines.push(TABULAR_COLUMNS.map((c) => csvCell(row[c] ?? "")).join(","));
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}

export async function toXlsx(items: { doc: ConceptDoc; status: string }[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  const ws = wb.addWorksheet("Concepts", { views: [{ state: "frozen", ySplit: 1, xSplit: 1 }] });
  ws.columns = TABULAR_COLUMNS.map((c) => ({
    header: c,
    key: c,
    width: c.startsWith("definition") || c.startsWith("notes") ? 60 : 22,
  }));
  ws.getRow(1).font = { bold: true };
  for (const { doc, status } of items) ws.addRow(docToRow(doc, status));
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: TABULAR_COLUMNS.length } };
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function readXlsx(data: ArrayBuffer): Promise<TabularRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data);
  const ws = wb.worksheets[0];
  if (!ws) throw new DomainError("INVALID", "The workbook has no sheets");
  const header = (ws.getRow(1).values as unknown[]).map((v) =>
    String(v ?? "")
      .trim()
      .toLowerCase(),
  );
  const rows: TabularRow[] = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const values = row.values as unknown[];
    const out: Record<string, string> = {};
    header.forEach((h, i) => {
      if (!(TABULAR_COLUMNS as readonly string[]).includes(h)) return;
      const v = values[i];
      out[h] =
        v == null
          ? ""
          : typeof v === "object" && "text" in (v as object)
            ? String((v as { text: unknown }).text)
            : String(v);
    });
    if (out.slug?.trim()) rows.push(out as TabularRow);
  });
  return rows;
}

const SKOS_CONTEXT = {
  skos: "http://www.w3.org/2004/02/skos/core#",
  dct: "http://purl.org/dc/terms/",
  owl: "http://www.w3.org/2002/07/owl#",
};

/** SKOS JSON-LD export: concepts, labels, definitions and relations, grouped by domain. */
export function toSkos(items: { doc: ConceptDoc; status: string }[], baseUri: string) {
  const uri = (slug: string) => `${baseUri}/concepts/${slug}`;
  const lit = (value: string, lang: string) => ({ "@value": value, "@language": lang });
  const both = (v?: { lv?: string; en?: string }) =>
    v ? (["lv", "en"] as const).filter((l) => v[l]).map((l) => lit(v[l]!, l)) : [];
  const scheme = `${baseUri}/scheme`;
  const graph: object[] = [
    {
      "@id": scheme,
      "@type": "skos:ConceptScheme",
      "dct:title": [
        lit("Apdrošināšanas biznesa vārdnīca", "lv"),
        lit("Insurance business vocabulary", "en"),
      ],
    },
  ];
  const domains = new Map<string, string[]>();
  for (const { doc, status } of items) {
    domains.set(doc.domain, [...(domains.get(doc.domain) ?? []), uri(doc.slug)]);
    const rel = (type: string) =>
      doc.relations.filter((r) => r.type === type).map((r) => ({ "@id": uri(r.target) }));
    graph.push({
      "@id": uri(doc.slug),
      "@type": "skos:Concept",
      "skos:inScheme": { "@id": scheme },
      "skos:notation": doc.slug,
      "skos:prefLabel": [lit(doc.labels.lv.preferred, "lv"), lit(doc.labels.en.preferred, "en")],
      "skos:altLabel": (["lv", "en"] as const).flatMap((l) =>
        [...doc.labels[l].alt, ...doc.labels[l].abbrev].map((a) => lit(a, l)),
      ),
      "skos:definition": both(doc.definition),
      "skos:example": both(doc.examples),
      "skos:scopeNote": both(doc.notes),
      "skos:broader": rel("BROADER"),
      "skos:related": [...rel("RELATED"), ...rel("PART_OF")],
      "dct:isReplacedBy": rel("REPLACED_BY"),
      ...(doc.metric ? { "skos:note": doc.metric.formula } : {}),
      ...(status === "DEPRECATED" ? { "owl:deprecated": true } : {}),
    });
  }
  for (const [key, members] of domains) {
    graph.push({
      "@id": `${baseUri}/domains/${key}`,
      "@type": "skos:Collection",
      "skos:notation": key,
      "skos:member": members.map((m) => ({ "@id": m })),
    });
  }
  return { "@context": SKOS_CONTEXT, "@graph": graph };
}

export interface ImportReport {
  created: string[];
  skipped: { slug: string; reason: string }[];
  invalid: { row: number; slug?: string; issues: string[] }[];
}

/**
 * Bulk bootstrap from Excel/CSV rows (admin only). New slugs become Candidate concepts awaiting
 * certification; existing slugs are skipped, because approved content changes go through review.
 */
export async function importRows(actor: Actor, rows: TabularRow[]): Promise<ImportReport> {
  assertAllowed(
    isAdmin(actor) ? { allowed: true } : { allowed: false, reason: "Glossary admin role required" },
  );
  const report: ImportReport = { created: [], skipped: [], invalid: [] };
  const docs: ConceptDoc[] = [];
  rows.forEach((row, i) => {
    const r = rowToDoc(row);
    if (r.ok) docs.push(r.doc);
    else
      report.invalid.push({
        row: i + 2,
        slug: row.slug,
        issues: r.issues.map((x) => `${x.path}: ${x.message}`),
      });
  });

  await db().$transaction(
    async (tx) => {
      const existing = new Set(
        (
          await tx.concept.findMany({
            where: { slug: { in: docs.map((d) => d.slug) } },
            select: { slug: true },
          })
        ).map((c) => c.slug),
      );
      const fresh: ConceptDoc[] = [];
      for (const doc of docs) {
        if (existing.has(doc.slug) || fresh.some((f) => f.slug === doc.slug)) {
          report.skipped.push({
            slug: doc.slug,
            reason: "Already exists — propose a change instead",
          });
          continue;
        }
        assertAllowed(canProposeChange(actor, doc.domain));
        fresh.push(doc);
      }
      const ids = new Map<string, string>();
      for (const doc of fresh) {
        const c = await writeConcept(tx, doc, {
          status: "CANDIDATE",
          authorId: actor.id,
          note: "Imported",
          skipLinks: true,
        });
        ids.set(doc.slug, c.id);
      }
      for (const doc of fresh) await syncLinks(tx, ids.get(doc.slug)!, doc);
      report.created = fresh.map((d) => d.slug);
      await audit(tx, {
        actorId: actor.id,
        action: "concept.import",
        entityType: "Concept",
        entityId: "*",
        details: { created: report.created.length, skipped: report.skipped.length },
      });
    },
    { timeout: 60_000 },
  );
  return report;
}
