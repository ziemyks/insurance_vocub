import type { ConceptDoc } from "./concept-schema";

/**
 * Lowercases and strips diacritics so that "zaudējumu" and "zaudejumu" match.
 * Applied both to stored search text and to the user's query.
 */
export function normalizeForSearch(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Search columns stored on a concept: labels only (ranked higher) and everything. */
export function buildSearchText(doc: ConceptDoc): { labelText: string; fullText: string } {
  const labels = (["lv", "en"] as const).flatMap((lang) => {
    const set = doc.labels[lang];
    return [set.preferred, ...set.alt, ...set.abbrev];
  });
  const labelText = normalizeForSearch([doc.slug.replaceAll("-", " "), ...labels].join(" | "));
  const body = [
    doc.definition.lv,
    doc.definition.en,
    doc.examples?.lv,
    doc.examples?.en,
    doc.notes?.lv,
    doc.notes?.en,
    doc.metric?.formula,
    ...doc.tags,
  ].filter((v): v is string => Boolean(v));
  return { labelText, fullText: normalizeForSearch([labelText, ...body].join(" | ")) };
}
