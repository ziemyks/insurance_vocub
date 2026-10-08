import { exportDocs, toCsv, toSkos, toXlsx } from "@vocab/db";
import { NextResponse } from "next/server";
import { api } from "@/lib/api";

/** GET /api/v1/export?format=xlsx|csv|skos — the whole vocabulary. */
export const GET = api(async (_ctx, req) => {
  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "xlsx";
  const items = await exportDocs();
  const stamp = new Date().toISOString().slice(0, 10);
  const download = (body: BodyInit, type: string, ext: string) =>
    new Response(body, {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `attachment; filename="vocabulary-${stamp}.${ext}"`,
      },
    });
  if (format === "csv") return download(toCsv(items), "text/csv; charset=utf-8", "csv");
  if (format === "skos")
    return NextResponse.json(toSkos(items, url.origin), {
      headers: { "Content-Disposition": `attachment; filename="vocabulary-${stamp}.jsonld"` },
    });
  return download(
    new Uint8Array(await toXlsx(items)),
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "xlsx",
  );
});
