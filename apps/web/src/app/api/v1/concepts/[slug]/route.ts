import { getConcept } from "@vocab/db";
import { NextResponse } from "next/server";
import { api } from "@/lib/api";

/** GET /api/v1/concepts/:slug — one concept with metric details and links. */
export const GET = api(async (_ctx, _req, { params }: { params: Promise<{ slug: string }> }) => {
  const c = await getConcept((await params).slug);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    slug: c.slug,
    type: c.type,
    status: c.status,
    revision: c.revision,
    domain: c.domain.key,
    approvedAt: c.approvedAt,
    reviewDueAt: c.reviewDueAt,
    doc: c.doc,
    usedBy: c.usedIn.map((u) => u.metric.slug),
    referencedBy: c.relationsTo.map((r) => r.from.slug),
  });
});
