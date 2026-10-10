# Deploying the proof of concept: Vercel + Supabase

The proof of concept runs on **Vercel** (the Next.js app) with **Supabase** (managed PostgreSQL). Both should be in the EU, in the same region. The test project runs in Supabase *West EU (Paris)*, so the Vercel functions are pinned to `cdg1` (Paris) in [apps/web/vercel.json](../apps/web/vercel.json). If you create a project in another region, change `regions` to the nearest Vercel region (e.g. `fra1` for Frankfurt).

The setup takes about 15 minutes. This page sets up a single environment. For a separate **test** environment and Entra ID sign-in, continue with [environments.md](environments.md).

## 1. Supabase: create the database

1. At [supabase.com](https://supabase.com), create a new project with region **Central EU (Frankfurt)** and a strong database password.
2. Open **Connect** (top bar) and copy two connection strings:
   - **Transaction pooler** (port **6543**). This becomes `DATABASE_URL`; the app uses it from serverless functions.
   - **Session pooler** (port **5432**). This becomes `DIRECT_URL`; it is used only to run migrations.
3. Recommended: under **Project Settings → Database → SSL Configuration**, download the CA certificate. Its PEM text becomes `DATABASE_CA_CERT`, which lets the app verify that it is talking to Supabase.
4. Optional but tidy: under **Project Settings → Data API**, turn the Data API off. The app does not use it. Even if you leave it on, a migration enables row-level security on every table and removes the API roles' access.

## 2. Create the tables and load the starter content (from your machine)

Add the Supabase values to your local `.env`. Use them only for this step, then switch back to the local database.

```bash
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require&uselibpqcompat=true"
DIRECT_URL="postgresql://postgres.<ref>:<password>@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

```bash
npm run db:deploy                          # create tables, search indexes, triggers, RLS
SEED_DEMO_USERS=true npm run db:seed       # 14 domains, 212 starter concepts, demo users
```

`sslmode=require&uselibpqcompat=true` encrypts the connection without checking the certificate. Set `DATABASE_CA_CERT` as well for full verification; the app then ignores the URL's `sslmode`.

## 3. Vercel: import the repository

1. On [vercel.com](https://vercel.com), choose **Add New → Project** and import `ziemyks/insurance_vocub` from GitHub.
2. Set **Root Directory** to `apps/web`. Vercel detects Next.js and the npm workspace; keep the default install and build commands. The build generates the Prisma client first.
3. Add these **Environment Variables** (Production and Preview):

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | Supabase transaction pooler URL (port 6543) from step 2 |
   | `DATABASE_CA_CERT` | PEM text of the Supabase CA certificate (recommended) |
   | `AUTH_SECRET` | output of `npx auth secret` |
   | `DEMO_ACCESS_CODE` | a long random code, e.g. `openssl rand -base64 18`; share it only with the testers |
   | `ROLE_GROUP_MAP` | `{}` until Entra ID is connected |

4. **Deploy.** Every push to `main` then redeploys automatically, and pull requests get preview URLs.

**Note on preview deployments.** By default, previews use the same Supabase database as production. That is fine for a proof of concept, but schema migrations must be run by hand (step 2) and are never run by the build.

## 4. Signing in

- **Demo access.** The sign-in page asks for the access code, then lets the tester pick a demo user. There is one demo user per role: admin, claims owner, claims steward, finance owner, contributor and viewer. Anyone who has the code and the URL can sign in, even as admin, so treat the code like a password. For an extra layer, turn on **Vercel → Settings → Deployment Protection**.
- **Open demo access (no code).** Set `DEMO_LOGIN=open` instead of `DEMO_ACCESS_CODE`. The sign-in page then lists the demo users directly, as on localhost. Anyone who finds the URL can sign in, even as admin, so use it only while the site holds test data. If both are set, the access code wins.
- **Company accounts (optional).** Register an Entra ID app with redirect URI `https://<your-vercel-domain>/api/auth/callback/microsoft-entra-id`, and add `AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET` and `AUTH_MICROSOFT_ENTRA_ID_ISSUER`. See the README for the groups claim and `ROLE_GROUP_MAP`. Once real accounts work, remove `DEMO_ACCESS_CODE` to switch demo access off.

## Limits of this setup (fine for a proof of concept)

- The Supabase free tier pauses projects after a week of inactivity, and the Vercel Hobby plan is for non-commercial use. Use paid tiers (Supabase Pro, Vercel Pro) for a pilot with real users.
- Data sits with US-headquartered providers, in EU regions. Check this with Compliance and the DPO before loading anything beyond the starter content. The production target remains Azure (see [infra](../infra) and [PLAN.md](PLAN.md)).
