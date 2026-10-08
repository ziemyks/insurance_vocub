import type { Lang } from "@vocab/core";

type Labelled = { labels: Record<string, { lv: string; en: string }> };

/** Display label for a controlled value, falling back to the raw code. */
export function label(vocab: Labelled, value: string | null | undefined, locale: Lang): string {
  if (!value) return "—";
  return vocab.labels[value]?.[locale] ?? value;
}

export function formatDate(value: Date | string | null | undefined, locale: Lang): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale === "lv" ? "lv-LV" : "en-GB", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function formatDateTime(value: Date | string | null | undefined, locale: Lang): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale === "lv" ? "lv-LV" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/** Preferred label in the UI language plus the other language as a subtitle. */
export function names(c: { preferredLv: string; preferredEn: string }, locale: Lang) {
  return locale === "lv"
    ? { main: c.preferredLv, sub: c.preferredEn }
    : { main: c.preferredEn, sub: c.preferredLv };
}
