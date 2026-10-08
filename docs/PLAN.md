# Plan: Insurance Business Vocabulary & Metrics Platform

## Context
The company needs one trusted place where all business terms and measurements (KPIs) are defined, agreed and linked to the data that produces them. Today, terms such as "loss ratio", "GWP" or "active policy" are likely defined differently in Finance, Actuarial, Claims, Sales and Power BI reports. The result is conflicting numbers, slow onboarding and regulatory risk under IFRS 17 and Solvency II.

The goal is a **web application with login, editing and stored history**. It will hold:
- a bilingual business glossary (LV + EN);
- a metric registry, where each KPI is both documented and tied to a formal formula in the **Azure Synapse → Power BI** semantic layer, so every report calculates it the same way;
- governance: owners, stewards, an approval workflow and an audit trail.

The repo `/Users/ziemyks/Desktop/insurance_vocub` is empty and has no commits, so this is a greenfield build. The context assumed is a Latvian non-life insurer in the PZU Group.

---

## 1. What the platform must contain (content scope)

### 1.1 Business domains (glossary structure)
| # | Domain | Example terms |
|---|---|---|
| 1 | Party & Customer | Policyholder, Insured, Beneficiary, Customer, Household, Active customer, Customer segment |
| 2 | Product & Coverage | Line of business, Product, Coverage, Peril, Sum insured, Limit, Deductible, Tariff, Add-on |
| 3 | Distribution & Sales | Channel (direct/agent/broker/bank/digital), Intermediary, Commission, Quote, New business, Renewal |
| 4 | Policy & Underwriting | Policy, Endorsement, Inception/expiry, Cancellation, Lapse, Policy in force, Exposure, Risk object, UW decision |
| 5 | Premium & Billing | Written/Earned/Unearned premium, Instalment, Premium receivable, Premium debt, Refund |
| 6 | Claims | FNOL, Claim, Claim case, Case reserve, Paid, Incurred, Recovery, Subrogation, Salvage, Reopened claim, Fraud suspicion |
| 7 | Reinsurance | Treaty, Facultative, Quota share, Excess of loss, Retention, Ceded premium, Reinsurance commission, RI recoveries |
| 8 | Actuarial & Reserving | Loss triangle, Development factor, IBNR, IBNER, Ultimate loss, Best estimate, Run-off result, Large loss, CAT event |
| 9 | Finance – IFRS 17 / IFRS 9 | Insurance contract, Portfolio, Group of contracts, Cohort, PAA, LRC, LIC, Risk adjustment, Loss component, Insurance revenue, Insurance service expense/result |
| 10 | Risk & Capital – Solvency II | SCR, MCR, Own funds, Solvency ratio, Technical provisions, SII line of business, QRT, ORSA |
| 11 | Investments | Investment income, Yield, Asset class, Duration |
| 12 | Customer Service & Operations | Complaint, SLA, NPS, CSAT, Straight-through processing, Contact |
| 13 | Regulatory & Compliance | IDD, GDPR, AML/KYC, DORA, Latvijas Banka reporting, OCTA (MTPL), LTAB, Green Card, CSRD/ESG |
| 14 | Reference data (code lists) | LoB codes, SII LoB mapping, IFRS 17 portfolios, claim cause codes, vehicle classes, regions, currencies (ISO 4217), countries (ISO 3166), NACE |

Initial target: about **150 core terms + 30 core KPIs** in the pilot. At full scale, expect about **600–1,000 terms and 150+ KPIs**.

### 1.2 Core KPI catalogue (minimum for a modern insurer)
- **Volume:** GWP, NWP, GEP, NEP, New business GWP, Policies in force, Average premium, Exposure (e.g. vehicle-years)
- **Profitability:** Loss ratio (gross/net), Expense ratio, Acquisition cost ratio, Commission ratio, **Combined ratio**, Underwriting result, Insurance service result (IFRS 17), Burning cost, Pure premium, ROE
- **Claims:** Claim frequency, Average severity, Large-loss share, Average settlement time, % settled within N days, Reopen rate, FNOL-to-first-payment time, Subrogation recovery rate, Fraud detection rate, Claims cost per claim
- **Reserving:** IBNR ratio, Reserve run-off result, Reserve adequacy
- **Customer & sales:** Retention/renewal rate, Lapse/churn rate, Quote conversion (hit ratio), Cross-sell (products per customer), CLV, CAC, NPS, Complaint ratio, Digital sales share
- **Operations:** Cost per policy, STP rate, Claims handled per FTE
- **Capital:** Solvency ratio (SCR coverage), MCR coverage, Investment yield

### 1.3 Explicit metric qualifiers
Insurance KPIs are ambiguous unless these qualifiers are explicit. The data model must make them **mandatory fields**, so "Loss ratio" exists as named variants and not as one vague number:
- **Reinsurance basis:** gross / net / ceded
- **Premium basis:** written / earned
- **Time basis:** calendar (accounting) year / accident year / underwriting year / reporting date
- **Accounting basis:** management / local statutory / IFRS 17 / Solvency II / PZU Group reporting
- **Inclusions:** with or without large losses / CAT, ALAE / ULAE, recoveries, taxes and levies
- **Grain & allowed dimensions:** for example by LoB, channel, region or month, plus a flag saying whether the KPI is additive

### 1.4 Standards to align with
- **SKOS** (W3C) for the concept structure and relations: preferred, alternative and hidden labels; broader, narrower and related links. This makes import and export interoperable.
- **ISO/IEC 11179** principles for the metadata registry: definition rules and naming.
- **DAMA-DMBOK / DCAM** for governance roles and processes.
- **ACORD P&C reference model**, used to name entities and avoid inventing new terms.
- Citations to **IFRS 17 paragraphs, Solvency II Directive / Delegated Regulation, EIOPA QRT templates** and Latvian law. Each regulatory term links to its source.

---

## 2. Application: functional requirements

**Access & roles** (Microsoft Entra ID SSO, roles mapped from Entra groups)
- Viewer: all employees. They read, search and comment.
- Contributor: proposes new terms or changes.
- Data Steward (per domain): edits and reviews.
- Data Owner (per domain, business head): approves and certifies.
- Glossary Admin: manages domains, roles, code lists and imports.

**Core features (MVP)**
1. Search with LV/EN, Latvian diacritics-insensitive matching, synonyms, abbreviations and fuzzy matching. Browse by domain and by A–Z.
2. **Term page:** LV/EN labels, definition, examples, notes, synonyms, relations, source citations, owner/steward, status, version history and linked data elements.
3. **Metric page:** everything on a term page plus formula (business notation), numerator/denominator links to other metrics, qualifiers (§1.3), unit, polarity (whether higher is better), DAX measure, reference SQL, Power BI model/measure link, refresh frequency, targets/thresholds and a worked example.
4. **Workflow:** Draft → In review → Approved/Certified → Deprecated (with "replaced by"). Change requests carry a reason. Owners recertify each item once a year.
5. **Full audit trail:** an immutable revision for every change, with who, when and why, and diffs between versions.
6. Comments and discussion on each item, plus @mentions.
7. **Import/export:** Excel/CSV for bulk loading existing definitions, and SKOS JSON-LD.
8. UI in LV and EN, switchable.

**Phase 2+ features**
- Relationship graph view of term and metric dependencies, for example Combined ratio → Loss ratio + Expense ratio.
- Data mapping: term ↔ Synapse table/column, metric ↔ Power BI measure, with a lineage view.
- Notifications by email or Microsoft Teams for reviews, approvals and recertification due.
- Glossary health dashboard: coverage per domain, stale items, items without owners, uncertified Power BI measures.
- REST API (read for everyone, write by role) so other apps and Power BI tooltips can pull definitions.
- AI assistant (later): semantic search, "what does X mean" Q&A, duplicate/conflict detection and draft definitions. Humans always approve.

---

## 3. Architecture (recommended)

| Layer | Choice | Why |
|---|---|---|
| Frontend + backend | **Next.js (React, TypeScript)**, full-stack, with REST API routes | One codebase and fast to build. Good i18n support (next-intl). |
| Database | **Azure Database for PostgreSQL – Flexible Server**, via the Prisma ORM | Relational model with versioning. `pg_trgm` + `unaccent` give fuzzy LV/EN search. |
| Auth | **Microsoft Entra ID (OIDC)** via Auth.js, with app roles / group claims | Company SSO and no separate passwords |
| Hosting | **Azure App Service or Container Apps**, plus Key Vault and Application Insights | Fits the existing Azure estate |
| Infra-as-code | **Bicep** | Native to Azure |
| CI/CD | GitHub Actions or Azure DevOps: lint, test, migrate, deploy | |
| Integrations | Power BI REST/Scanner API + XMLA endpoint; Synapse SQL (read-only service principal); optional Microsoft Purview glossary sync | See §4 |

### 3.1 Application data model (main entities)
- `Domain`, `Subdomain`
- `Concept`: the base for terms and metrics. Fields: id, type, status, domain, owner, steward, certified flag, review-due date.
- `ConceptLabel`: lang (lv/en), kind (preferred/alt/abbrev/hidden), text
- `ConceptDefinition`: lang, definition, examples, notes
- `ConceptRelation`: broader / narrower / related / partOf / replacedBy / calculatedFrom
- `Metric` (1:1 with Concept): formula, unit, aggregation, additivity, qualifiers (§1.3), grain, allowed dimensions, polarity, DAX, reference SQL, PBI dataset + measure id, targets
- `CodeList`, `CodeValue`: reference data with LV/EN labels and validity dates
- `DataElement`: Synapse object/column or PBI measure, with a `ConceptDataMapping` link
- `SourceReference`: regulation or document citation
- `Revision`: an immutable JSON snapshot for each saved change, plus `ChangeRequest`, `Review`, `Comment` and `AuditLog`
- `UserRoleAssignment`: user/group → role → domain scope

### 3.2 Proposed repo layout
```
apps/web/                  Next.js app (UI + API)
packages/db/               Prisma schema, migrations, seed loader
content/seed/              Starter terms & KPIs as YAML (LV/EN), version-controlled, imported to DB
integrations/powerbi/      Scanner sync, TMDL/description push, measure matching
integrations/synapse/      Reference SQL per KPI + reconciliation tests, schema harvester
infra/                     Bicep (App Service, Postgres, Key Vault, App Insights, private endpoints)
docs/                      Architecture, governance handbook, definition-writing guide, contributor guide
.github/workflows/         CI/CD
```

---

## 4. Semantic layer (Synapse + Power BI)
Rule: **the metric registry is the source of truth for meaning, and the certified Power BI semantic model is the single place where KPIs are calculated.**

1. **Synapse gold layer (star schema)** that the KPIs need:
   - Facts: `fact_premium_written` (policy transactions), `fact_premium_earned`, `fact_claim_transaction` (payments, reserve movements, recoveries), `fact_exposure`, `fact_quote`, `fact_reinsurance_cession`, `fact_expense`
   - Dims: date in several roles (transaction, accounting, accident, underwriting year), policy, product, coverage, LoB (with SII and IFRS 17 portfolio mapping), channel, intermediary, customer, claim, region, currency, IFRS 17 cohort
2. **Certified Power BI semantic models**, for example Premium & Portfolio, Claims, Finance/IFRS 17. Store them as Power BI Projects (PBIP/TMDL) in git. Every certified measure has a registry ID.
3. **Sync in both directions:**
   - Registry → Power BI: push measure descriptions and display folders into the TMDL, or via XMLA/Tabular Editor scripts.
   - Power BI → Registry: the Scanner API harvests every measure in the tenant, matches each one to registry metrics and flags duplicates or uncertified look-alikes, such as a private "Loss Ratio" measure in someone's report.
4. **Reconciliation tests:** for each KPI, compare the DAX result with the registry's reference SQL on Synapse for fixed periods, within a tolerance. Run them in CI and on a schedule.
5. SQL views in Synapse (`sem.*`) for consumers that don't use Power BI, such as actuarial tools and Python.

---

## 5. Governance (organisation & process)
- **Sponsor:** CFO or CDO. **Glossary council:** domain owners, meeting monthly. It settles conflicts and approves cross-domain KPIs.
- **Stewards** per domain, part-time from Finance, Actuarial, Claims, Underwriting, Sales, Risk, Compliance and Customer Service.
- **Definition-writing guide:** one concept per term; define it, don't describe it; no circular definitions; cite sources; LV and EN equivalent in meaning.
- **Conflict rule:** when two departments truly need different meanings, create qualified variants (§1.3) that are explicitly named. Never let two things share one name.
- **Lifecycle:** yearly recertification, deprecation with "replaced by", and a change impact list showing which reports and measures use the item.
- **Compliance:** register the app as an ICT asset under **DORA**. It stores minimal personal data (user identity only), which keeps the GDPR footprint small. Audit retention follows company policy.

---

## 6. Roadmap & team

| Phase | Duration | Deliverables |
|---|---|---|
| 0. Mobilise | 3–4 wks | Sponsor and council set up, pilot domains chosen (**Premium + Claims**), inventory of existing definitions (Excel files, report docs, actuarial/IFRS 17 policies, QRT instructions), stack and Entra app registration confirmed |
| 1. MVP | 8–10 wks | SSO, roles, CRUD for terms/metrics, LV/EN, search, workflow, revisions, Excel import, seed of ~150 terms + 30 KPIs |
| 2. Metrics ↔ BI | 8 wks | Gold-layer facts/dims for the pilot KPIs, certified PBI model, registry ↔ PBI sync, reconciliation tests, mapping UI |
| 3. Scale | ongoing | All domains incl. IFRS 17, SII, Reinsurance; Teams notifications; health dashboard; public API; optional Purview sync |
| 4. AI assist | later | Semantic search, Q&A, duplicate detection, draft definitions |

**Team:** product owner (data governance lead), 1–2 full-stack developers, 1 BI/data engineer (Synapse + Power BI), 1 business analyst/glossary editor, part-time domain stewards, plus Azure infra and security support.

---

## 7. Implementation order (first build steps in this repo)
1. Scaffold the monorepo (`apps/web`, `packages/db`, `content/seed`, `infra`, `docs`) with TypeScript, ESLint and Prettier.
2. Prisma schema for the §3.1 entities and the first migration; local Postgres via Docker Compose.
3. Entra ID login (Auth.js) and role mapping from group claims, with a dev-mode mock login.
4. Term and metric CRUD, the workflow state machine and immutable revisions.
5. Search (pg_trgm + unaccent) and the LV/EN UI.
6. YAML seed loader with pilot content: Premium and Claims terms and core KPIs.
7. Excel/CSV import and export.
8. Bicep infra and CI/CD to an Azure dev environment.
9. Phase 2 integrations (Power BI Scanner/TMDL, Synapse reconciliation).

---

## 8. Verification
- **Unit tests:** the workflow state machine (no one approves their own change, and only owners can certify), revision immutability and qualifier validation (a metric can't be saved without a reinsurance basis, time basis or accounting basis).
- **E2E (Playwright):** log in as different roles → create a term → submit → steward review → owner approve → visible to a viewer. Search "zaudējumu" and "zaudejumu" and get the same results. Switch LV/EN.
- **Seed validation in CI:** every YAML seed item has LV + EN, an owner and a domain, and its relations resolve.
- **Metric reconciliation:** DAX and reference SQL agree for the pilot KPIs on fixed historical periods.
- **UAT:** pilot stewards from Finance and Claims define 20 real KPIs end to end and confirm their reports match.
- **Security:** pentest/security review before production, private endpoints, Key Vault secrets, and no anonymous access.
