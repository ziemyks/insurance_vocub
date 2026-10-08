import { parseConceptDoc, type ConceptDoc, type ParseResult } from "./concept-schema";

/**
 * Flat row representation of a concept for Excel/CSV import and export.
 * List cells are separated by "; ". Relations and components use "TYPE:slug";
 * inclusions use "item=VALUE".
 */
export const TABULAR_COLUMNS = [
  "slug",
  "type",
  "domain",
  "status",
  "preferred_lv",
  "preferred_en",
  "alt_lv",
  "alt_en",
  "abbrev_lv",
  "abbrev_en",
  "definition_lv",
  "definition_en",
  "examples_lv",
  "examples_en",
  "notes_lv",
  "notes_en",
  "relations",
  "sources",
  "tags",
  "formula",
  "unit",
  "aggregation",
  "additivity",
  "polarity",
  "reinsurance_basis",
  "premium_basis",
  "time_basis",
  "accounting_basis",
  "inclusions",
  "grain",
  "dimensions",
  "components",
  "refresh_frequency",
  "target",
  "dax",
  "reference_sql",
  "powerbi_dataset",
  "powerbi_measure",
] as const;

export type TabularColumn = (typeof TABULAR_COLUMNS)[number];
export type TabularRow = Partial<Record<TabularColumn, string>>;

const SEP = "; ";
const join = (values: readonly string[] | undefined) => (values ?? []).join(SEP);
const split = (cell: string | undefined) =>
  (cell ?? "")
    .split(";")
    .map((v) => v.trim())
    .filter(Boolean);

function pairs(cell: string | undefined, delimiter: string): [string, string][] {
  return split(cell).map((item) => {
    const i = item.indexOf(delimiter);
    return i < 0 ? [item, ""] : [item.slice(0, i).trim(), item.slice(i + 1).trim()];
  });
}

export function docToRow(doc: ConceptDoc, status = ""): TabularRow {
  const m = doc.metric;
  return {
    slug: doc.slug,
    type: doc.type,
    domain: doc.domain,
    status,
    preferred_lv: doc.labels.lv.preferred,
    preferred_en: doc.labels.en.preferred,
    alt_lv: join(doc.labels.lv.alt),
    alt_en: join(doc.labels.en.alt),
    abbrev_lv: join(doc.labels.lv.abbrev),
    abbrev_en: join(doc.labels.en.abbrev),
    definition_lv: doc.definition.lv,
    definition_en: doc.definition.en,
    examples_lv: doc.examples?.lv ?? "",
    examples_en: doc.examples?.en ?? "",
    notes_lv: doc.notes?.lv ?? "",
    notes_en: doc.notes?.en ?? "",
    relations: join(doc.relations.map((r) => `${r.type}:${r.target}`)),
    sources: join(doc.sources.map((s) => [s.title, s.reference].filter(Boolean).join(" | "))),
    tags: join(doc.tags),
    formula: m?.formula ?? "",
    unit: m?.unit ?? "",
    aggregation: m?.aggregation ?? "",
    additivity: m?.additivity ?? "",
    polarity: m?.polarity ?? "",
    reinsurance_basis: m?.qualifiers.reinsuranceBasis ?? "",
    premium_basis: m?.qualifiers.premiumBasis ?? "",
    time_basis: m?.qualifiers.timeBasis ?? "",
    accounting_basis: m?.qualifiers.accountingBasis ?? "",
    inclusions: join(Object.entries(m?.qualifiers.inclusions ?? {}).map(([k, v]) => `${k}=${v}`)),
    grain: m?.grain ?? "",
    dimensions: join(m?.dimensions),
    components: join(m?.components.map((c) => `${c.role}:${c.metric}`)),
    refresh_frequency: m?.refreshFrequency ?? "",
    target: m?.target ?? "",
    dax: m?.dax ?? "",
    reference_sql: m?.referenceSql ?? "",
    powerbi_dataset: m?.powerBi?.dataset ?? "",
    powerbi_measure: m?.powerBi?.measure ?? "",
  };
}

const opt = (v: string | undefined) => (v?.trim() ? v.trim() : undefined);
const bilingual = (lv: string | undefined, en: string | undefined) =>
  opt(lv) || opt(en) ? { lv: opt(lv), en: opt(en) } : undefined;

export function rowToDoc(row: TabularRow): ParseResult {
  const type = opt(row.type)?.toUpperCase();
  const input = {
    slug: opt(row.slug),
    type,
    domain: opt(row.domain),
    labels: {
      lv: {
        preferred: row.preferred_lv ?? "",
        alt: split(row.alt_lv),
        abbrev: split(row.abbrev_lv),
      },
      en: {
        preferred: row.preferred_en ?? "",
        alt: split(row.alt_en),
        abbrev: split(row.abbrev_en),
      },
    },
    definition: { lv: row.definition_lv ?? "", en: row.definition_en ?? "" },
    examples: bilingual(row.examples_lv, row.examples_en),
    notes: bilingual(row.notes_lv, row.notes_en),
    relations: pairs(row.relations, ":").map(([t, target]) => ({ type: t.toUpperCase(), target })),
    sources: split(row.sources).map((s) => {
      const [title, reference] = s.split("|").map((p) => p.trim());
      return { title, reference: opt(reference) };
    }),
    tags: split(row.tags),
    metric:
      type === "METRIC"
        ? {
            formula: row.formula ?? "",
            unit: opt(row.unit),
            aggregation: opt(row.aggregation),
            additivity: opt(row.additivity),
            polarity: opt(row.polarity),
            qualifiers: {
              reinsuranceBasis: opt(row.reinsurance_basis),
              premiumBasis: opt(row.premium_basis),
              timeBasis: opt(row.time_basis),
              accountingBasis: opt(row.accounting_basis),
              inclusions: Object.fromEntries(pairs(row.inclusions, "=")),
            },
            grain: opt(row.grain),
            dimensions: split(row.dimensions),
            components: pairs(row.components, ":").map(([role, metric]) => ({
              role: role.toUpperCase(),
              metric,
            })),
            refreshFrequency: opt(row.refresh_frequency),
            target: opt(row.target),
            dax: opt(row.dax),
            referenceSql: opt(row.reference_sql),
            powerBi:
              opt(row.powerbi_dataset) && opt(row.powerbi_measure)
                ? { dataset: row.powerbi_dataset!.trim(), measure: row.powerbi_measure!.trim() }
                : undefined,
          }
        : undefined,
  };
  return parseConceptDoc(input);
}
