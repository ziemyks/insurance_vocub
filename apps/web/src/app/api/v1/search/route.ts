import { searchConcepts } from "@vocab/db";
import { NextResponse } from "next/server";
import { api } from "@/lib/api";

/** GET /api/v1/search?q= — ranked, diacritics-insensitive search. */
export const GET = api(async (_ctx, req) => {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return NextResponse.json({ q, hits: await searchConcepts(q, { limit: 25 }) });
});
