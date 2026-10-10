# Environments: test and production on Vercel

The proof of concept runs in two hosted environments, each with its own database, URL and sign-in configuration. Code moves from `test` to `main` by pull request.

| | Local | **Test** | **Production** |
|---|---|---|---|
| Git branch | any | `test` | `main` |
| Vercel environment | — | Preview, branch `test` | Production |
| URL | localhost:3000 | stable test URL (see step 3) | production URL / custom domain |
| Supabase project | Docker | `vocab-test` | `vocab-prod` |
| Sign-in | demo users | Entra ID (TEST app) + demo access code | Entra ID (PROD app); until then demo users via `DEMO_ACCESS_CODE` or `DEMO_LOGIN=open` |
| Visual marker | — | yellow **TEST ENVIRONMENT** bar, "[TEST]" in tab titles | none |
| Migrations | `npm run db:deploy` | automatic on push to `test` | automatic on push to `main` |
| Seed content | `npm run db:seed` | automatic, with demo users | only when run manually |

The app decides which environment it is from `APP_ENV`, or from Vercel's `VERCEL_ENV` when that isn't set: preview counts as test.

---

## 1. Supabase: one project per environment

Create two projects in **Central EU (Frankfurt)**: `vocab-test` and `vocab-prod`. For each, note the following (see [deploy-vercel.md](deploy-vercel.md) for where to find them):

- **Transaction pooler** URL (port 6543). Add `?sslmode=require&uselibpqcompat=true`. This is `DATABASE_URL`.
- **Session pooler** URL (port 5432). Add `?sslmode=require`. This is `DIRECT_URL`.
- **CA certificate** (optional, recommended). This is `DATABASE_CA_CERT`.

## 2. GitHub: environments and secrets for automatic migrations

The workflow [.github/workflows/db-migrate.yml](../.github/workflows/db-migrate.yml) creates and updates the tables for you.

1. In the repository, go to **Settings → Environments** and create two environments: **`test`** and **`production`**.
2. Add the same three **environment secrets** to each, using that environment's Supabase values: `DATABASE_URL`, `DIRECT_URL` and (optionally) `DATABASE_CA_CERT`.
3. Recommended: on **production**, add a *required reviewer*, so schema changes to production wait for approval.
4. The `test` branch already exists. To run the workflow for the first time, open **Actions → Database migrations → Run workflow** and pick the branch:
   - **test:** tables + starter content + demo users.
   - **main:** tables. Tick **seed** if production should also get the 212 starter concepts.

## 3. Vercel: environment variables per branch

There is one Vercel project (Root Directory `apps/web`, see [deploy-vercel.md](deploy-vercel.md)). In **Settings → Environment Variables**:

| Variable | Production | Preview → branch `test` |
|---|---|---|
| `DATABASE_URL` | prod transaction pooler URL | test transaction pooler URL |
| `DATABASE_CA_CERT` | prod CA (optional) | test CA (optional) |
| `AUTH_SECRET` | `npx auth secret` | a **different** `npx auth secret` |
| `AUTH_URL` | `https://<production URL>` | `https://<stable test URL>` |
| `APP_ENV` | `production` | `test` |
| `DEMO_ACCESS_CODE` | only until Entra ID works, then delete | long random code (`openssl rand -base64 18`) |
| `AUTH_MICROSOFT_ENTRA_ID_ID` | PROD app client ID | TEST app client ID |
| `AUTH_MICROSOFT_ENTRA_ID_SECRET` | PROD app secret | TEST app secret |
| `AUTH_MICROSOFT_ENTRA_ID_ISSUER` | `https://login.microsoftonline.com/<tenant-id>/v2.0` | same |
| `ROLE_GROUP_MAP` | JSON, see step 4 | JSON, see step 4 |
| `DEFAULT_ROLE` | `VIEWER` | `CONTRIBUTOR` (lets every tester propose) |

When adding a Preview variable, choose **"Preview" → "Select a custom Git branch" → `test`**. Pull-request previews of other branches use the plain Preview values. Point those at the test database too (or leave them unset), never at production.

**Stable test URL.** Each push gets its own deployment URL, but Entra ID needs one fixed address. Use either:
- the automatic branch URL, `https://<project>-git-test-<team>.vercel.app` (shown on the deployment page under *Domains*), or
- a custom domain, e.g. `vocab-test.<your-domain>`. Add it under **Settings → Domains** and set its *Git branch* to `test`.

**Deployment Protection.** By default, Vercel puts its own login wall ("Vercel Authentication") in front of preview deployments. Testers without a Vercel account, and Microsoft's sign-in callback, would be blocked by it. Under **Settings → Deployment Protection**, either turn Vercel Authentication off for previews, or keep it and add the test domain as an exception (paid plans). The app's own sign-in still protects all data.

After saving variables, **redeploy** the branch: Deployments → ⋯ → Redeploy.

## 4. Entra ID: what has to be set up

Your Entra ID (Azure AD) administrator has to do this; it needs rights to register applications. Forward [entra-id-request.md](entra-id-request.md), which lists exactly what to create and which values to send back. In short:

1. **Two app registrations:** *Business Vocabulary (TEST)* and *Business Vocabulary (PROD)*. Each has its own redirect URI and secret, so test can never issue sessions for production.
2. **Redirect URIs** (type *Web*):
   - TEST: `https://<stable test URL>/api/auth/callback/microsoft-entra-id`, plus `http://localhost:3000/api/auth/callback/microsoft-entra-id` for local development.
   - PROD: `https://<production URL>/api/auth/callback/microsoft-entra-id`
3. **Groups claim** in the ID token (Group ID), so roles come from group membership.
4. **Security groups** for the roles (names are suggestions):

   | Group | Role in the app |
   |---|---|
   | `SG-Vocab-Admins` | Glossary admin (all domains) |
   | `SG-Vocab-Contributors` | Contributor (all domains) |
   | `SG-Vocab-Claims-Owners` / `-Stewards` | Data owner / steward, Claims |
   | `SG-Vocab-Finance-Owners` / `-Stewards` | Data owner / steward, Finance & IFRS 17 |
   | `SG-Vocab-Premium-Owners` / `-Stewards` | Data owner / steward, Premium & Billing |
   | … one pair per domain that has named owners | |

   Everyone who can sign in but is in none of these groups is a **viewer**.
5. **Assignment required = Yes** on both enterprise applications, with the groups above (or named testers) assigned. Then only invited people can sign in, which matters especially for test.

### Turning group IDs into roles: `ROLE_GROUP_MAP`

Put the group **Object IDs** you receive into this JSON, on a single line, as the Vercel variable `ROLE_GROUP_MAP`. Domain keys are listed in [packages/core/src/domains.ts](../packages/core/src/domains.ts).

```json
{
  "<object-id of SG-Vocab-Admins>":          { "role": "ADMIN" },
  "<object-id of SG-Vocab-Contributors>":    { "role": "CONTRIBUTOR" },
  "<object-id of SG-Vocab-Claims-Owners>":   { "role": "OWNER",   "domain": "claims" },
  "<object-id of SG-Vocab-Claims-Stewards>": { "role": "STEWARD", "domain": "claims" },
  "<object-id of SG-Vocab-Finance-Owners>":  { "role": "OWNER",   "domain": "finance" }
}
```

A group can grant several roles: `"<id>": [{ "role": "OWNER", "domain": "claims" }, { "role": "OWNER", "domain": "actuarial" }]`. An invalid JSON or an unknown domain key stops sign-in with an error, so typos are caught at once.

Roles from Entra are re-synced at every sign-in and appear on the **Admin** page with source `ENTRA`. Admins can still grant extra roles by hand there.

## 5. Check that everything works

On the **test** URL:

1. The yellow **TEST ENVIRONMENT** bar is visible.
2. **Sign in with your company account** returns you to the home page. Entra login only appears once the Entra variables are set.
3. Your name is in the header; **Admin → Roles** shows your groups' roles with source `ENTRA`.
4. The demo access code still works for testers without Entra access.
5. Run the full workflow once: propose a term, endorse it as a steward, approve it as an owner.

Then do steps 2–3 on **production** and **delete `DEMO_ACCESS_CODE` from Production** in Vercel.

## Common problems

| Symptom | Cause / fix |
|---|---|
| Microsoft error **AADSTS50011** (redirect URI mismatch) | The URL in the browser isn't registered. Use the stable URL, check `AUTH_URL`, and check the redirect URI matches character for character. |
| Microsoft error **AADSTS50105** | The user isn't assigned to the app (assignment required); add them or their group. |
| **AADSTS65001** / consent prompt that users can't accept | The tenant blocks user consent; the admin must click *Grant admin consent* for `User.Read`. |
| Signed in but only a viewer | The groups claim is missing or the group isn't in `ROLE_GROUP_MAP`. Users in more than 200 groups get no groups in the token: set the claim to *Groups assigned to the application*. |
| Vercel login page instead of the app | Deployment Protection is on for previews (step 3). |
| Server error on sign-in after a few months | The client secret expired; create a new one and update Vercel. |
