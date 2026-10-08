import type { ConceptDocInput } from "./concept-schema";

export const termInput: ConceptDocInput = {
  slug: "deductible",
  type: "TERM",
  domain: "product",
  labels: {
    lv: { preferred: "Pašrisks" },
    en: { preferred: "Deductible", alt: ["Excess"] },
  },
  definition: {
    lv: "Zaudējumu daļa, kuru sedz apdrošinājuma ņēmējs.",
    en: "The part of a loss borne by the policyholder.",
  },
};

export const metricInput: ConceptDocInput = {
  slug: "gross-loss-ratio",
  type: "METRIC",
  domain: "finance",
  labels: {
    lv: { preferred: "Bruto zaudējumu koeficients" },
    en: { preferred: "Gross loss ratio", abbrev: ["LR"] },
  },
  definition: {
    lv: "Bruto radušos zaudējumu attiecība pret bruto nopelnītajām prēmijām.",
    en: "The ratio of gross claims incurred to gross earned premium.",
  },
  metric: {
    formula: "Gross claims incurred / Gross earned premium",
    unit: "PERCENT",
    aggregation: "RATIO",
    additivity: "NON_ADDITIVE",
    polarity: "LOWER_IS_BETTER",
    qualifiers: {
      reinsuranceBasis: "GROSS",
      premiumBasis: "EARNED",
      timeBasis: "CALENDAR_YEAR",
      accountingBasis: "MANAGEMENT",
    },
    components: [
      { role: "NUMERATOR", metric: "gross-claims-incurred" },
      { role: "DENOMINATOR", metric: "gross-earned-premium" },
    ],
  },
};
