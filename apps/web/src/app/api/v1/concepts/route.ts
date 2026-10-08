import { DOMAINS } from "@vocab/core";
import { createChange, listConcepts, readDoc } from "@vocab/db";
import { NextResponse } from "next/server";
import { api } from "@/lib/api";

/** GET /api/v1/concepts?domain=&type=&status= — list concepts with their full documents. */
export const GET = api(async (_ctx, req) => {
  const p = new URL(req.url).searchParams;
  const type = p.get("type");
  const status = p.get("status");
  const domain = p.get("domain");
  const items = await listConcepts({
    domain: DOMAINS.some((d) => d.key === domain) ? domain! : undefined,
    type: type === "TERM" || type === "METRIC" ? type : undefined,
    status:
      status === "CANDIDATE" || status === "APPROVED" || status === "DEPRECATED"
        ? status
        : undefined,
  });
  return NextResponse.json({
    count: items.length,
    items: items.map((c) => ({
      slug: c.slug,
      type: c.type,
      status: c.status,
      domain: c.domain.key,
      updatedAt: c.updatedAt,
      doc: readDoc(c.doc),
    })),
  });
});

/** POST /api/v1/concepts — open a change request: { kind, slug?, payload?, replacedBy?, reason }. */
export const POST = api(async ({ actor }, req) => {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "JSON body required" }, { status: 400 });
  const kind = body.kind === "UPDATE" || body.kind === "DEPRECATE" ? body.kind : "CREATE";
  const change = await createChange(actor, {
    kind,
    slug: typeof body.slug === "string" ? body.slug : undefined,
    payload: body.payload,
    replacedBy: typeof body.replacedBy === "string" ? body.replacedBy : undefined,
    reason: String(body.reason ?? ""),
  });
  return NextResponse.json(
    { number: change.number, status: change.status, url: `/changes/${change.number}` },
    { status: 201 },
  );
});
