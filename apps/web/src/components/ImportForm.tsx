"use client";

import type { Lang } from "@vocab/core";
import { useActionState } from "react";
import type { ActionState } from "@/app/actions";
import { MESSAGES } from "@/lib/messages";

export function ImportForm({
  action,
  label,
  locale,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  label: string;
  locale: Lang;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const r = state.report;
  return (
    <form action={formAction} className="stack">
      <input
        type="file"
        name="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        required
      />
      <button className="btn secondary small" disabled={pending}>
        {label}
      </button>
      {state.message && <p className="banner error">{state.message}</p>}
      {r && (
        <div className="banner info small">
          <strong>
            {MESSAGES[locale].admin.importResult(
              r.created.length,
              r.skipped.length,
              r.invalid.length,
            )}
          </strong>
          {r.invalid.length > 0 && (
            <ul>
              {r.invalid.slice(0, 20).map((i) => (
                <li key={i.row}>
                  #{i.row} {i.slug}: {i.issues.join("; ")}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
