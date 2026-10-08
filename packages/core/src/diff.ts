import type { ConceptDoc } from "./concept-schema";

export interface FieldChange {
  path: string;
  before: string | undefined;
  after: string | undefined;
}

function renderItem(item: unknown): string {
  if (item === null || item === undefined) return "";
  if (typeof item === "object")
    return Object.values(item).map(renderItem).filter(Boolean).join(" · ");
  return String(item);
}

/** Flattens a document to `path → display string`. Arrays become one multi-line value. */
export function flattenDoc(doc: unknown, prefix = "", out: Record<string, string> = {}) {
  if (doc === null || doc === undefined) return out;
  if (Array.isArray(doc)) {
    if (doc.length > 0) out[prefix] = doc.map(renderItem).join("\n");
    return out;
  }
  if (typeof doc === "object") {
    for (const [key, value] of Object.entries(doc)) {
      flattenDoc(value, prefix ? `${prefix}.${key}` : key, out);
    }
    return out;
  }
  const text = String(doc);
  if (text !== "") out[prefix] = text;
  return out;
}

/** Field-level differences between two versions; `null` means "did not exist". */
export function diffDocs(before: ConceptDoc | null, after: ConceptDoc | null): FieldChange[] {
  const a = flattenDoc(before);
  const b = flattenDoc(after);
  const paths = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  return paths.filter((p) => a[p] !== b[p]).map((p) => ({ path: p, before: a[p], after: b[p] }));
}
