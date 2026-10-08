# Insurance Business Vocabulary

A web application that holds the company's **business glossary and metric registry** in Latvian and English. It gives every term (policy, claim, IBNR…) and every KPI (GWP, loss ratio, combined ratio…) one agreed definition, a named owner, an approval workflow and a full, immutable history. Metrics carry their formula and their mandatory calculation basis (gross/net, written/earned, time basis, accounting basis). Each metric can also be linked to its certified Power BI measure.

The overall plan is in [docs/PLAN.md](docs/PLAN.md).

## What's in the box

| Area | Where |
|---|---|
| Web app (Next.js 16, React 19, Auth.js with Microsoft Entra ID) | [apps/web](apps/web) |
| Domain logic: concept schema, workflow, permissions, search normalisation, Excel mapping | [packages/core](packages/core/src) |
| Database (PostgreSQL + Prisma 7): services, seed, validation | [packages/db](packages/db) |
| Starter content: 212 concepts (124 terms, 88 metrics) in 14 domains, plus the Solvency II LoB code list | [content/seed](content/seed) |
| Governance handbook | [docs/governance.md](docs/governance.md) |
| Semantic layer design (Synapse + Power BI, phase 2) | [docs/semantic-layer.md](docs/semantic-layer.md) |
| Open questions on the starter content for domain stewards | [docs/content-review.md](docs/content-review.md) |
| Azure infrastructure (Bicep) | [infra](infra) |
| CI | [.github/workflows/ci.yml](.github/workflows/ci.yml) |

## Quick start (local)

Prerequisites: Node.js 22+, Docker.

```bash
cp .env.example .env            # then set AUTH_SECRET: npx auth secret
npm install
npm run db:up                   # Postgres 17 in Docker
npm run db:generate
npm run db:deploy               # apply migrations
npm run db:seed                 # domains, starter content, demo users (dev only)
npm run dev                     # http://localhost:3000
```

With `AUTH_DEV_LOGIN=true` the sign-in page lists demo users, each with a different role (admin, claims owner, claims steward, finance owner, contributor, viewer), so you can try the whole workflow locally. Dev login is disabled in production builds whatever the setting.

> **iCloud Drive warning (macOS).** If the repo sits in an iCloud-synced folder such as Desktop or Documents, macOS evicts files from `node_modules`, and tools hang while the files download again. Either move the repo out of iCloud, or exclude the heavy folders: `xattr -w 'com.apple.fileprovider.ignore#P' 1 node_modules apps/web/.next`.

## Tests

```bash
npm test                        # unit tests (schema, workflow, permissions, diff, Excel mapping)
npm run content:validate        # every seed file against the schema + cross-references
npm run test:db:setup           # once: create, migrate and seed the vocab_test database
npm run test:db                 # integration tests against Postgres
npm run test:e2e                # Playwright: full propose → endorse → approve flow, search, LV/EN
```

The E2E suite starts its own server against `vocab_test`, so stop `npm run dev` first.

## How it works

- **Concept document.** Each term or metric is one validated JSON document ([concept-schema.ts](packages/core/src/concept-schema.ts)). Seed YAML, Excel import, the edit form, change requests, revisions and the API all use this same shape.
- **Changes go through review.** Proposals become change requests: Draft → Submitted → (Endorsed by steward) → Approved by owner. The author can never approve their own change. Approving writes the concept and an immutable revision in a single transaction.
- **Optimistic concurrency.** A change request records the revision it was based on. If someone else's change is approved first, the stale request must be rebased before it can be approved.
- **Append-only history.** Database triggers reject any UPDATE or DELETE on `Revision` and `AuditLog`.
- **Search** ignores diacritics ("zaudejumu" finds "zaudējumu"), ranks exact label and abbreviation matches first, and tolerates typos (`pg_trgm`).
- **Starter content is "Candidate".** It is visible but marked as not yet certified, until the domain's data owner certifies it. Approved concepts are due for recertification every 12 months.

## Roles

| Role | Can |
|---|---|
| Viewer (every signed-in employee) | read, search, comment, export |
| Contributor | propose new concepts and changes |
| Data steward (per domain) | endorse or return changes in their domain |
| Data owner (per domain) | approve/reject changes, certify and recertify concepts |
| Glossary admin | manage roles and domain owners, bulk import |

Roles come from **Entra ID groups**: map group object IDs to roles in `ROLE_GROUP_MAP`. They are synced at every sign-in. Admins can also grant roles manually on the Admin page. Set `DEFAULT_ROLE=CONTRIBUTOR` to let every employee propose changes.

### Entra ID app registration

1. Register a web app with redirect URI `https://<host>/api/auth/callback/microsoft-entra-id`.
2. Under **Token configuration**, add the **groups** claim (security groups, emitted as object IDs).
3. Set `AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET` and `AUTH_MICROSOFT_ENTRA_ID_ISSUER=https://login.microsoftonline.com/<tenant-id>/v2.0`.
4. If users belong to more than 200 groups, assign the app to specific groups so the token stays within the groups-claim limit.

## API

All endpoints require a signed-in session.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/concepts?domain=&type=&status=` | list concepts with full documents |
| GET | `/api/v1/concepts/:slug` | one concept, with "used by" and "referenced by" |
| POST | `/api/v1/concepts` | open a change request `{ kind, slug?, payload?, replacedBy?, reason }` |
| GET | `/api/v1/search?q=` | ranked search |
| GET | `/api/v1/export?format=xlsx\|csv\|skos` | full export (SKOS JSON-LD for interoperability) |

## Deployment

[infra/main.bicep](infra/main.bicep) provisions an App Service (Linux, Node 22), PostgreSQL Flexible Server, Key Vault and Application Insights. Production settings are listed in `.env.example`. Never set `AUTH_DEV_LOGIN` in Azure. Run `npm run db:deploy` as a release step before swapping slots. When scaling out to more than one instance, set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` to the same value on every instance.
