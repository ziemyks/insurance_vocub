import "server-only";
import { DomainError } from "@vocab/db";
import { NextResponse } from "next/server";
import { apiUser } from "./session";

type Ctx = NonNullable<Awaited<ReturnType<typeof apiUser>>>;

/** Wraps an API handler: requires a session and maps business errors to HTTP statuses. */
export function api<A extends unknown[]>(
  handler: (ctx: Ctx, req: Request, ...args: A) => Promise<Response>,
) {
  return async (req: Request, ...args: A) => {
    const ctx = await apiUser();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
      return await handler(ctx, req, ...args);
    } catch (e) {
      if (e instanceof DomainError) {
        const status = { FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, INVALID: 422 }[e.code];
        return NextResponse.json({ error: e.message, details: e.details }, { status });
      }
      throw e;
    }
  };
}
