# Semantic layer: Synapse + Power BI (phase 2)

**Principle:** the registry is the source of truth for what a KPI *means*; one certified Power BI semantic model is the single place where it is *calculated*. No report defines its own "loss ratio".

## 1. Gold layer in Azure Synapse

A star schema at the grain the KPIs need. Names are proposals to agree with the data platform team.

| Table | Grain | Feeds |
|---|---|---|
| `fact_premium_written` | policy transaction (new, renewal, endorsement, cancellation) | GWP, NWP, new-business GWP, commission |
| `fact_premium_earned` | policy × coverage × month | GEP, NEP, UPR |
| `fact_exposure` | policy × risk object × month | earned exposure, policies in force |
| `fact_claim_transaction` | claim × transaction (payment, reserve movement, recovery) | claims paid/incurred, frequency, severity, settlement time |
| `fact_reserve_snapshot` | claim/segment × reporting date | case reserves, IBNR, run-off |
| `fact_reinsurance_cession` | policy/claim × treaty × month | ceded premium, RI recoveries, cession rate |
| `fact_expense` | cost centre × account × month | acquisition and administrative expenses |
| `fact_quote` | quote | quotes issued, conversion |

Dimensions: date (role-playing: transaction, accounting, accident, underwriting year, reporting date), policy, product, coverage, line of business (with Solvency II LoB and IFRS 17 portfolio mapping), channel, intermediary, customer, claim, region, currency, IFRS 17 cohort.

Business keys, code values and column names should match the registry: each column maps to a concept through `ConceptDataMapping`.

## 2. Certified Power BI semantic models

- Three to start: **Premium & Portfolio**, **Claims**, **Finance & IFRS 17**.
- Stored as **Power BI Projects (PBIP/TMDL)** in git, deployed through deployment pipelines, and endorsed as *Certified* in the Power BI service.
- Every measure that implements a registry metric carries the registry slug in its description (`[vocab:gross-loss-ratio]`) and is placed in a display folder named after the domain.
- The metric record stores the dataset and measure name, the DAX expression and a reference SQL query.

## 3. Synchronisation

| Direction | Mechanism | Purpose |
|---|---|---|
| Registry → Power BI | Script writes measure descriptions (LV/EN definition + formula) into TMDL, or via the XMLA endpoint | Users see the agreed definition as a tooltip in every report |
| Power BI → Registry | Power BI **Scanner API** (admin) harvests all measures in the tenant | Finds look-alike, uncertified measures (e.g. a private "Loss Ratio") and flags them on the governance dashboard |
| Synapse → Registry | `INFORMATION_SCHEMA` harvest into `DataElement` | Lineage and term-to-column mapping |
| Registry → Purview (optional) | Purview glossary API | If Microsoft Purview becomes the enterprise catalogue |

## 4. Reconciliation tests

For each certified metric, a scheduled job evaluates the DAX measure (via `executeQueries` / XMLA) and the registry's reference SQL on Synapse over fixed historical periods and segments. It fails if they differ by more than the tolerance (e.g. 0.01 % or EUR 1). Results are shown on the metric page; a failing metric loses its "certified for reporting" mark.

## 5. Non-Power BI consumers

Expose `sem.*` views in Synapse (one per certified metric family) for actuarial tools, Python and regulatory reporting, generated from the same reference SQL.
