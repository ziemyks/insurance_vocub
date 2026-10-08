export type DomainErrorCode = "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "INVALID";

/** An expected business-rule failure, safe to show to the user. */
export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export function assertAllowed(decision: { allowed: boolean; reason?: string }): void {
  if (!decision.allowed) throw new DomainError("FORBIDDEN", decision.reason ?? "Not allowed");
}
