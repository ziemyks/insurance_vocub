import type { FieldChange } from "@vocab/core";

export function DiffTable({
  changes,
  labels,
}: {
  changes: FieldChange[];
  labels: { field: string; before: string; after: string; none: string };
}) {
  if (!changes.length) return <p className="muted">{labels.none}</p>;
  return (
    <div className="table-wrap">
      <table className="diff">
        <thead>
          <tr>
            <th>{labels.field}</th>
            <th>{labels.before}</th>
            <th>{labels.after}</th>
          </tr>
        </thead>
        <tbody>
          {changes.map((c) => (
            <tr key={c.path}>
              <td>
                <code>{c.path}</code>
              </td>
              <td className={c.before !== undefined ? "before" : ""}>{c.before ?? "—"}</td>
              <td className={c.after !== undefined ? "after" : ""}>{c.after ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
