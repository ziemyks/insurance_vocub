# Glossary governance

How business terms and metrics are owned, changed and kept current. This puts plan §5 into practice; the app enforces the workflow rules described here.

## Roles

| Role | Who | Responsibility |
|---|---|---|
| Sponsor | CFO or CDO | Mandates use of the glossary; resolves escalations |
| Glossary council | All domain data owners + glossary admin | Monthly: cross-domain conflicts, new domains, KPI changes that affect several areas |
| Data owner | Head of the business area (one per domain) | Approves changes, certifies concepts, recertifies them every year |
| Data steward | Subject-matter expert (one or more per domain) | Drafts and endorses definitions; first reviewer of changes |
| Contributor | Anyone granted the role | Proposes new concepts and changes |
| Glossary admin | Data governance team | Roles, domain set-up, imports, writing-quality checks |

Suggested first owners and stewards: Finance (finance, investments), Actuarial (actuarial, reserving), Claims (claims), Underwriting/Product (product, policy), Sales (distribution, party), Risk (risk-capital), Reinsurance (reinsurance), Compliance (compliance), Customer Service (service-operations), Data office (reference-data).

## Workflow

1. **Propose.** A contributor opens a change request (new, change or deprecation) with a reason.
2. **Submit.** Every referenced concept must already exist.
3. **Endorse** (optional, recommended). A steward checks content and wording.
4. **Approve or reject.** The data owner decides. The author can never approve their own change. If the change touches two domains, for example by moving a concept, the approver needs the owner role in both.
5. **Publish.** On approval the concept is updated and a new immutable revision is written. The concept stays visible throughout the review, and readers always see the last approved version.

Returned requests ("changes requested") go back to the author. If another change to the same concept was approved in the meantime, the author must **rebase** first; the app blocks approval of stale requests.

## Lifecycle

- **Candidate**: starter content or imported, visible but not yet certified.
- **Approved**: certified by the owner. Due for **recertification after 12 months**. The home page lists overdue items.
- **Deprecated**: kept for history, with a "replaced by" link. Concepts are never deleted.

## Writing a definition

- **One concept per entry.** If two departments need different meanings, create **explicitly named variants** (e.g. *gross loss ratio* and *net loss ratio*, or *combined ratio* and *IFRS 17 combined ratio*). Never let two meanings share one name.
- **Define; don't describe.** Start with the class: "An amount that…", "A person who…", "The ratio of…".
- **No circularity.** Don't use the term, or a near-synonym, inside its own definition.
- **LV and EN say exactly the same thing.** Use official Latvian terms where they exist: IFRS and Solvency II wording from the EU Official Journal, and Latvian insurance law.
- **Cite the source** for regulatory concepts: standard, paragraph or article.
- **Use notes for traps.** Write down the confusions people actually make (written vs earned, accident vs calendar year, gross vs net).

## Metrics: mandatory basis

Every metric states its **reinsurance basis, premium basis, time basis and accounting basis**, plus how large losses, catastrophe losses, ALAE, ULAE and recoveries are treated where losses are involved. "Not applicable" is a valid choice, but it must be made deliberately. Components refer to other registered metrics, so the calculation tree is explicit and every number is defined only once.

A metric is **certified for reporting** when its definition is approved **and** it is linked to a measure in a certified Power BI semantic model that passes reconciliation (see [semantic-layer.md](semantic-layer.md)).
