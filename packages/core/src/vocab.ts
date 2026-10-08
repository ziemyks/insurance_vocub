/**
 * Controlled values used by the concept schema, each with LV/EN display labels.
 * Metric qualifiers implement plan §1.3: they are mandatory so that variants such as
 * "gross earned loss ratio, accident year, IFRS 17" are explicit and never confused.
 */
type Labels = { lv: string; en: string };

function labelled<const K extends string>(values: Record<K, Labels>) {
  return { values: Object.keys(values) as [K, ...K[]], labels: values };
}

export const CONCEPT_TYPE = labelled({
  TERM: { lv: "Termins", en: "Term" },
  METRIC: { lv: "Rādītājs", en: "Metric" },
});

export const RELATION_TYPE = labelled({
  BROADER: { lv: "Plašāks jēdziens", en: "Broader concept" },
  RELATED: { lv: "Saistīts jēdziens", en: "Related concept" },
  PART_OF: { lv: "Daļa no", en: "Part of" },
  REPLACED_BY: { lv: "Aizstāts ar", en: "Replaced by" },
});

export const METRIC_UNIT = labelled({
  AMOUNT_EUR: { lv: "Summa (EUR)", en: "Amount (EUR)" },
  PERCENT: { lv: "Procenti", en: "Percent" },
  RATIO: { lv: "Attiecība", en: "Ratio" },
  COUNT: { lv: "Skaits", en: "Count" },
  DAYS: { lv: "Dienas", en: "Days" },
  YEARS: { lv: "Gadi", en: "Years" },
  SCORE: { lv: "Punkti", en: "Score" },
});

export const AGGREGATION = labelled({
  SUM: { lv: "Summa", en: "Sum" },
  RATIO: { lv: "Attiecība (summu dalījums)", en: "Ratio of sums" },
  AVERAGE: { lv: "Vidējais", en: "Average" },
  COUNT: { lv: "Skaits", en: "Count" },
  DISTINCT_COUNT: { lv: "Unikālo skaits", en: "Distinct count" },
  LAST_VALUE: { lv: "Perioda beigu vērtība", en: "Period-end value" },
  CUSTOM: { lv: "Īpašs aprēķins", en: "Custom" },
});

export const ADDITIVITY = labelled({
  ADDITIVE: { lv: "Summējams", en: "Additive" },
  SEMI_ADDITIVE: { lv: "Daļēji summējams (ne laikā)", en: "Semi-additive (not over time)" },
  NON_ADDITIVE: { lv: "Nesummējams", en: "Non-additive" },
});

export const POLARITY = labelled({
  HIGHER_IS_BETTER: { lv: "Augstāks ir labāk", en: "Higher is better" },
  LOWER_IS_BETTER: { lv: "Zemāks ir labāk", en: "Lower is better" },
  NEUTRAL: { lv: "Neitrāls", en: "Neutral" },
});

export const REINSURANCE_BASIS = labelled({
  GROSS: { lv: "Bruto (pirms pārapdrošināšanas)", en: "Gross (before reinsurance)" },
  NET: { lv: "Neto (pēc pārapdrošināšanas)", en: "Net (after reinsurance)" },
  CEDED: { lv: "Nodotā pārapdrošināšanā daļa", en: "Ceded share" },
  NOT_APPLICABLE: { lv: "Nav attiecināms", en: "Not applicable" },
});

export const PREMIUM_BASIS = labelled({
  WRITTEN: { lv: "Parakstītās", en: "Written" },
  EARNED: { lv: "Nopelnītās", en: "Earned" },
  NOT_APPLICABLE: { lv: "Nav attiecināms", en: "Not applicable" },
});

export const TIME_BASIS = labelled({
  CALENDAR_YEAR: { lv: "Uzskaites (kalendārais) periods", en: "Calendar / accounting period" },
  ACCIDENT_YEAR: { lv: "Negadījuma gads", en: "Accident year" },
  UNDERWRITING_YEAR: { lv: "Parakstīšanas gads", en: "Underwriting year" },
  REPORTING_DATE: { lv: "Stāvoklis pārskata datumā", en: "Position at reporting date" },
  NOT_APPLICABLE: { lv: "Nav attiecināms", en: "Not applicable" },
});

export const ACCOUNTING_BASIS = labelled({
  MANAGEMENT: { lv: "Vadības uzskaite", en: "Management" },
  LOCAL_STATUTORY: { lv: "Vietējā normatīvā uzskaite", en: "Local statutory" },
  IFRS17: { lv: "17. SFPS", en: "IFRS 17" },
  SOLVENCY_II: { lv: "Maksātspēja II", en: "Solvency II" },
  GROUP_REPORTING: { lv: "Grupas (PZU) pārskati", en: "Group (PZU) reporting" },
  NOT_APPLICABLE: { lv: "Nav attiecināms", en: "Not applicable" },
});

export const INCLUSION = labelled({
  INCLUDED: { lv: "Iekļauts", en: "Included" },
  EXCLUDED: { lv: "Izslēgts", en: "Excluded" },
  NOT_APPLICABLE: { lv: "Nav attiecināms", en: "Not applicable" },
});

/** Items whose treatment must be stated explicitly for loss-based metrics. */
export const INCLUSION_ITEM = labelled({
  largeLosses: { lv: "Lielie zaudējumi", en: "Large losses" },
  catastropheLosses: { lv: "Katastrofu zaudējumi", en: "Catastrophe losses" },
  alae: {
    lv: "Tieši piesaistāmie regulēšanas izdevumi (ALAE)",
    en: "Allocated loss adjustment expenses (ALAE)",
  },
  ulae: {
    lv: "Nepiesaistāmie regulēšanas izdevumi (ULAE)",
    en: "Unallocated loss adjustment expenses (ULAE)",
  },
  recoveries: { lv: "Regresi un atgūtās summas", en: "Subrogation and salvage recoveries" },
});

export const COMPONENT_ROLE = labelled({
  NUMERATOR: { lv: "Skaitītājs", en: "Numerator" },
  DENOMINATOR: { lv: "Saucējs", en: "Denominator" },
  COMPONENT: { lv: "Sastāvdaļa", en: "Component" },
});

export const REFRESH_FREQUENCY = labelled({
  DAILY: { lv: "Katru dienu", en: "Daily" },
  WEEKLY: { lv: "Katru nedēļu", en: "Weekly" },
  MONTHLY: { lv: "Katru mēnesi", en: "Monthly" },
  QUARTERLY: { lv: "Katru ceturksni", en: "Quarterly" },
  ANNUAL: { lv: "Katru gadu", en: "Annual" },
});

export const CONCEPT_STATUS = labelled({
  CANDIDATE: { lv: "Kandidāts (jāapstiprina)", en: "Candidate (awaiting certification)" },
  APPROVED: { lv: "Apstiprināts", en: "Approved" },
  DEPRECATED: { lv: "Novecojis", en: "Deprecated" },
});

export const CHANGE_STATUS = labelled({
  DRAFT: { lv: "Melnraksts", en: "Draft" },
  SUBMITTED: { lv: "Iesniegts", en: "Submitted" },
  ENDORSED: { lv: "Pārbaudīts (pārvaldnieks)", en: "Endorsed by steward" },
  CHANGES_REQUESTED: { lv: "Jālabo", en: "Changes requested" },
  APPROVED: { lv: "Apstiprināts", en: "Approved" },
  REJECTED: { lv: "Noraidīts", en: "Rejected" },
  WITHDRAWN: { lv: "Atsaukts", en: "Withdrawn" },
});

export const CHANGE_KIND = labelled({
  CREATE: { lv: "Jauns", en: "New" },
  UPDATE: { lv: "Izmaiņas", en: "Change" },
  DEPRECATE: { lv: "Atcelšana", en: "Deprecation" },
});

export const ROLE = labelled({
  VIEWER: { lv: "Lasītājs", en: "Viewer" },
  CONTRIBUTOR: { lv: "Ierosinātājs", en: "Contributor" },
  STEWARD: { lv: "Datu pārvaldnieks", en: "Data steward" },
  OWNER: { lv: "Datu īpašnieks", en: "Data owner" },
  ADMIN: { lv: "Administrators", en: "Glossary admin" },
});

export type Lang = "lv" | "en";
export type ConceptType = (typeof CONCEPT_TYPE.values)[number];
export type RelationType = (typeof RELATION_TYPE.values)[number];
export type ConceptStatus = (typeof CONCEPT_STATUS.values)[number];
export type ChangeStatus = (typeof CHANGE_STATUS.values)[number];
export type ChangeKind = (typeof CHANGE_KIND.values)[number];
export type Role = (typeof ROLE.values)[number];
