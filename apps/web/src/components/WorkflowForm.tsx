"use client";

import { useActionState } from "react";
import { workflowAction, type ActionState } from "@/app/actions";

/** Workflow buttons for a change request; one shared comment box. */
export function WorkflowForm({
  changeId,
  actions,
  labels,
  commentLabel,
}: {
  changeId: string;
  actions: string[];
  labels: Record<string, string>;
  commentLabel: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(workflowAction, {});
  if (!actions.length) return null;
  const style = (a: string) =>
    a === "approve"
      ? "btn"
      : a === "reject" || a === "withdraw"
        ? "btn danger"
        : a === "submit"
          ? "btn accent"
          : "btn secondary";
  return (
    <form action={formAction} className="stack">
      <input type="hidden" name="changeId" value={changeId} />
      <div className="field">
        <label>
          {commentLabel}
          <textarea name="comment" rows={3} />
        </label>
      </div>
      {state.message && (
        <p className="banner error" role="alert">
          {state.message}
        </p>
      )}
      <div className="row">
        {actions.map((a) => (
          <button
            key={a}
            name="action"
            value={a}
            className={style(a)}
            disabled={pending}
            data-testid={`action-${a}`}
          >
            {labels[a] ?? a}
          </button>
        ))}
      </div>
    </form>
  );
}
