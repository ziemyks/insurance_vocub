import { z } from "zod";
import { DOMAIN_KEYS } from "./domains";
import {
  ACCOUNTING_BASIS,
  ADDITIVITY,
  AGGREGATION,
  COMPONENT_ROLE,
  CONCEPT_TYPE,
  INCLUSION,
  METRIC_UNIT,
  POLARITY,
  PREMIUM_BASIS,
  REFRESH_FREQUENCY,
  REINSURANCE_BASIS,
  RELATION_TYPE,
  TIME_BASIS,
} from "./vocab";

/**
 * The concept document: the single shape used by seed YAML, change-request payloads,
 * revisions, imports and the API. Everything a term or metric "says" lives here.
 */

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const slug = z
  .string()
  .regex(SLUG_PATTERN, "Use lowercase letters, digits and hyphens, e.g. gross-written-premium");

const text = z.string().trim();

/** A controlled value; a missing value reads "Required" instead of listing every option. */
const choice = <const T extends readonly [string, ...string[]]>(values: T) =>
  z.enum(values, {
    error: (issue) => (issue.input === undefined || issue.input === "" ? "Required" : undefined),
  });
const requiredText = text.min(1, "Required");

const labelSet = z.object({
  preferred: requiredText,
  alt: z.array(requiredText).default([]),
  abbrev: z.array(requiredText).default([]),
});

const bilingualRequired = z.object({ lv: requiredText, en: requiredText });
const bilingualOptional = z.object({ lv: text.optional(), en: text.optional() });

export const relationSchema = z.object({
  type: choice(RELATION_TYPE.values),
  target: slug,
});

export const sourceSchema = z.object({
  title: requiredText,
  reference: text.optional(),
  url: z.url({ protocol: /^https?$/, error: "Use an http(s) link" }).optional(),
});

const inclusion = choice(INCLUSION.values);

export const metricSchema = z.object({
  formula: requiredText,
  unit: choice(METRIC_UNIT.values),
  aggregation: choice(AGGREGATION.values),
  additivity: choice(ADDITIVITY.values),
  polarity: choice(POLARITY.values),
  qualifiers: z.object({
    reinsuranceBasis: choice(REINSURANCE_BASIS.values),
    premiumBasis: choice(PREMIUM_BASIS.values),
    timeBasis: choice(TIME_BASIS.values),
    accountingBasis: choice(ACCOUNTING_BASIS.values),
    inclusions: z
      .object({
        largeLosses: inclusion.optional(),
        catastropheLosses: inclusion.optional(),
        alae: inclusion.optional(),
        ulae: inclusion.optional(),
        recoveries: inclusion.optional(),
      })
      .default({}),
  }),
  grain: text.optional(),
  dimensions: z.array(requiredText).default([]),
  components: z.array(z.object({ role: choice(COMPONENT_ROLE.values), metric: slug })).default([]),
  dax: text.optional(),
  referenceSql: text.optional(),
  powerBi: z.object({ dataset: requiredText, measure: requiredText }).optional(),
  refreshFrequency: choice(REFRESH_FREQUENCY.values).optional(),
  target: text.optional(),
  example: bilingualOptional.optional(),
});

export const conceptDocSchema = z
  .object({
    slug,
    type: choice(CONCEPT_TYPE.values),
    domain: z.enum(DOMAIN_KEYS as [string, ...string[]]),
    labels: z.object({ lv: labelSet, en: labelSet }),
    definition: bilingualRequired,
    examples: bilingualOptional.optional(),
    notes: bilingualOptional.optional(),
    relations: z.array(relationSchema).default([]),
    sources: z.array(sourceSchema).default([]),
    tags: z.array(requiredText).default([]),
    metric: metricSchema.optional(),
  })
  .superRefine((doc, ctx) => {
    if (doc.type === "METRIC" && !doc.metric) {
      ctx.addIssue({
        code: "custom",
        path: ["metric"],
        message: "A metric needs its calculation details",
      });
    }
    if (doc.type === "TERM" && doc.metric) {
      ctx.addIssue({
        code: "custom",
        path: ["metric"],
        message: "Only metrics have calculation details",
      });
    }
    if (doc.relations.some((r) => r.target === doc.slug)) {
      ctx.addIssue({
        code: "custom",
        path: ["relations"],
        message: "A concept cannot relate to itself",
      });
    }
    if (doc.metric?.components.some((c) => c.metric === doc.slug)) {
      ctx.addIssue({
        code: "custom",
        path: ["metric", "components"],
        message: "A metric cannot be its own component",
      });
    }
  });

export type ConceptDoc = z.output<typeof conceptDocSchema>;
export type ConceptDocInput = z.input<typeof conceptDocSchema>;
export type MetricDoc = NonNullable<ConceptDoc["metric"]>;

export interface ValidationIssue {
  path: string;
  message: string;
}

export type ParseResult = { ok: true; doc: ConceptDoc } | { ok: false; issues: ValidationIssue[] };

export function parseConceptDoc(input: unknown): ParseResult {
  const result = conceptDocSchema.safeParse(input);
  if (result.success) return { ok: true, doc: result.data };
  return {
    ok: false,
    issues: result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
  };
}

/** Every slug a document points at (relations and metric components). */
export function referencedSlugs(doc: ConceptDoc): string[] {
  const targets = doc.relations.map((r) => r.target);
  for (const c of doc.metric?.components ?? []) targets.push(c.metric);
  return [...new Set(targets)];
}
