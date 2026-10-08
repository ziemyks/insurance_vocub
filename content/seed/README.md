# Seed content

This folder holds the starter vocabulary: one YAML file per business domain, named after the domain key (for example `claims.yaml`). The seed loader (`npm run db:seed`) imports every file. CI runs `npm run content:validate` to check that each item matches the concept schema in [packages/core/src/concept-schema.ts](../../packages/core/src/concept-schema.ts) and that every cross-reference resolves.

Seeded items load with status **Candidate**: they are proposals until the domain's Data Owner certifies them in the app. After go-live the app is the source of truth, and these files are only for bootstrapping new environments.

## File format

```yaml
domain: claims            # must equal the file name
concepts:
  - slug: claim-frequency          # stable id: lowercase, hyphens, never reused
    type: METRIC                   # TERM | METRIC
    labels:
      lv: { preferred: "Atlīdzību biežums", alt: [], abbrev: [] }
      en: { preferred: "Claim frequency", alt: ["Claims frequency"], abbrev: [] }
    definition:
      lv: "..."
      en: "Number of reported claims per unit of earned exposure in a period."
    examples: { lv: "...", en: "..." }        # optional
    notes: { lv: "...", en: "..." }           # optional: caveats, common confusions
    relations:                                # optional; target = slug of another concept
      - { type: RELATED, target: earned-exposure }   # BROADER | RELATED | PART_OF | REPLACED_BY
    sources:                                  # optional; cite only what you are sure of
      - { title: "IFRS 17 Insurance Contracts", reference: "Appendix A" }
    tags: [kpi, pricing]
    metric:                                   # required for METRIC, forbidden for TERM
      formula: "Number of claims reported / Earned exposure"
      unit: RATIO          # AMOUNT_EUR | PERCENT | RATIO | COUNT | DAYS | YEARS | SCORE
      aggregation: RATIO   # SUM | RATIO | AVERAGE | COUNT | DISTINCT_COUNT | LAST_VALUE | CUSTOM
      additivity: NON_ADDITIVE   # ADDITIVE | SEMI_ADDITIVE | NON_ADDITIVE
      polarity: LOWER_IS_BETTER  # HIGHER_IS_BETTER | LOWER_IS_BETTER | NEUTRAL
      qualifiers:                # all four are mandatory; use NOT_APPLICABLE consciously
        reinsuranceBasis: GROSS            # GROSS | NET | CEDED | NOT_APPLICABLE
        premiumBasis: EARNED               # WRITTEN | EARNED | NOT_APPLICABLE
        timeBasis: ACCIDENT_YEAR           # CALENDAR_YEAR | ACCIDENT_YEAR | UNDERWRITING_YEAR | REPORTING_DATE | NOT_APPLICABLE
        accountingBasis: MANAGEMENT        # MANAGEMENT | LOCAL_STATUTORY | IFRS17 | SOLVENCY_II | GROUP_REPORTING | NOT_APPLICABLE
        inclusions:                        # optional per item: INCLUDED | EXCLUDED | NOT_APPLICABLE
          largeLosses: INCLUDED
          catastropheLosses: EXCLUDED
      grain: "Month × line of business"
      dimensions: ["Line of business", "Product", "Sales channel", "Region"]
      components:                          # metrics this one is calculated from
        - { role: NUMERATOR, metric: reported-claims-count }
        - { role: DENOMINATOR, metric: earned-exposure }
      refreshFrequency: MONTHLY            # DAILY | WEEKLY | MONTHLY | QUARTERLY | ANNUAL
      example: { lv: "...", en: "1,200 claims / 40,000 vehicle-years = 0.03" }
      # dax, referenceSql and powerBi are filled in once the certified Power BI model exists
```

## Writing rules

- **One concept per entry.** If two departments need different meanings, create explicitly named variants, e.g. `gross-loss-ratio` and `net-loss-ratio`.
- **Define; don't describe.** Start with the class the concept belongs to ("An amount…", "The ratio of…", "A person who…"). Don't repeat the term inside its own definition.
- **LV and EN must mean exactly the same thing.** Use established Latvian insurance and IFRS terminology with correct diacritics.
- **Metric components are themselves metrics** and must exist as `METRIC` entries.
