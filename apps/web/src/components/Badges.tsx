import { CHANGE_STATUS, CONCEPT_STATUS, type Lang } from "@vocab/core";
import { label } from "@/lib/format";
import { MESSAGES } from "@/lib/messages";

export function StatusBadge({
  status,
  locale,
  kind = "concept",
}: {
  status: string;
  locale: Lang;
  kind?: "concept" | "change";
}) {
  return (
    <span className={`badge ${status}`}>
      {label(kind === "concept" ? CONCEPT_STATUS : CHANGE_STATUS, status, locale)}
    </span>
  );
}

export function TypeBadge({ type, locale }: { type: string; locale: Lang }) {
  const t = MESSAGES[locale].common;
  return (
    <span className={`badge ${type === "METRIC" ? "metric" : ""}`}>
      {type === "METRIC" ? t.metric : t.term}
    </span>
  );
}
