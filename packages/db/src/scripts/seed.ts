/**
 * Loads domains, starter concepts (as Candidates) and code lists. Idempotent: existing concepts
 * are never overwritten, so it is safe to re-run after content has been edited in the app.
 * With AUTH_DEV_LOGIN=true it also creates demo users with one role each, for local testing.
 */
import "./env";
import { DOMAINS, type Role } from "@vocab/core";
import { db } from "../client";
import { syncLinks, writeConcept } from "../concepts";
import { loadContent } from "../content";

const DEMO_USERS: { email: string; name: string; role: Role; domain: string | null }[] = [
  { email: "admin@demo.local", name: "Anna Admin", role: "ADMIN", domain: null },
  {
    email: "owner.claims@demo.local",
    name: "Oskars Owner (Claims)",
    role: "OWNER",
    domain: "claims",
  },
  {
    email: "steward.claims@demo.local",
    name: "Sanita Steward (Claims)",
    role: "STEWARD",
    domain: "claims",
  },
  {
    email: "owner.finance@demo.local",
    name: "Fēlikss Owner (Finance)",
    role: "OWNER",
    domain: "finance",
  },
  {
    email: "contributor@demo.local",
    name: "Kārlis Contributor",
    role: "CONTRIBUTOR",
    domain: null,
  },
  { email: "viewer@demo.local", name: "Vija Viewer", role: "VIEWER", domain: null },
];

const prisma = db();
const { docs, codeLists, problems } = await loadContent();
if (problems.length) {
  for (const p of problems)
    console.error(`✗ ${p.file}${p.slug ? ` [${p.slug}]` : ""}: ${p.message}`);
  throw new Error("Seed content is invalid; run npm run content:validate");
}

for (const d of DOMAINS) {
  const data = {
    order: d.order,
    nameLv: d.name.lv,
    nameEn: d.name.en,
    descriptionLv: d.description.lv,
    descriptionEn: d.description.en,
  };
  await prisma.domain.upsert({
    where: { key: d.key },
    create: { key: d.key, ...data },
    update: data,
  });
}
console.log(`✓ ${DOMAINS.length} domains`);

const created = await prisma.$transaction(
  async (tx) => {
    const existing = new Set(
      (await tx.concept.findMany({ select: { slug: true } })).map((c) => c.slug),
    );
    const fresh = docs.filter((d) => !existing.has(d.slug));
    const ids = new Map<string, string>();
    for (const doc of fresh) {
      const c = await writeConcept(tx, doc, {
        status: "CANDIDATE",
        note: "Starter content (seed)",
        skipLinks: true,
      });
      ids.set(doc.slug, c.id);
    }
    for (const doc of fresh) await syncLinks(tx, ids.get(doc.slug)!, doc);
    return fresh.length;
  },
  { timeout: 120_000 },
);
console.log(`✓ ${created} new concepts (${docs.length - created} already present)`);

for (const list of codeLists) {
  const data = {
    nameLv: list.name.lv,
    nameEn: list.name.en,
    descriptionLv: list.description?.lv,
    descriptionEn: list.description?.en,
    conceptSlug: list.conceptSlug,
  };
  const cl = await prisma.codeList.upsert({
    where: { key: list.key },
    create: { key: list.key, ...data },
    update: data,
  });
  for (const [i, v] of list.values.entries()) {
    const value = { labelLv: v.lv, labelEn: v.en, sortOrder: i };
    await prisma.codeValue.upsert({
      where: { codeListId_code: { codeListId: cl.id, code: v.code } },
      create: { codeListId: cl.id, code: v.code, ...value },
      update: value,
    });
  }
}
console.log(`✓ ${codeLists.length} code lists`);

if (process.env.AUTH_DEV_LOGIN === "true" && process.env.NODE_ENV !== "production") {
  for (const u of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      create: { email: u.email, name: u.name },
      update: { name: u.name },
    });
    const domain = u.domain
      ? await prisma.domain.findUniqueOrThrow({ where: { key: u.domain } })
      : null;
    const has = await prisma.roleAssignment.findFirst({
      where: { userId: user.id, role: u.role, domainId: domain?.id ?? null },
    });
    if (!has && u.role !== "VIEWER") {
      await prisma.roleAssignment.create({
        data: { userId: user.id, role: u.role, domainId: domain?.id ?? null, source: "SEED" },
      });
    }
  }
  const claims = await prisma.domain.findUniqueOrThrow({ where: { key: "claims" } });
  const owner = await prisma.user.findUniqueOrThrow({
    where: { email: "owner.claims@demo.local" },
  });
  const steward = await prisma.user.findUniqueOrThrow({
    where: { email: "steward.claims@demo.local" },
  });
  await prisma.domain.update({
    where: { id: claims.id },
    data: { ownerId: owner.id, stewardId: steward.id },
  });
  console.log(`✓ ${DEMO_USERS.length} demo users (dev login)`);
}

await prisma.$disconnect();
