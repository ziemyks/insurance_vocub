"use client";

import { useActionState, type ReactNode } from "react";
import type { ActionState } from "@/app/actions";

/** A form bound to a server action that shows its error or success message inline. */
export function ActionForm({
  action,
  children,
  submitLabel,
  successMessage,
  className,
  submitClassName = "btn",
  resetOnSuccess = false,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  children?: ReactNode;
  submitLabel: string;
  successMessage?: string;
  className?: string;
  submitClassName?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      action={formAction}
      className={className}
      key={resetOnSuccess && state.ok ? Math.random() : undefined}
    >
      {children}
      {state.message && (
        <p className={`banner ${state.ok === false ? "error" : "info"}`} role="alert">
          {state.message}
        </p>
      )}
      {state.ok && successMessage && <p className="banner info">{successMessage}</p>}
      <button className={submitClassName} disabled={pending}>
        {submitLabel}
      </button>
    </form>
  );
}
