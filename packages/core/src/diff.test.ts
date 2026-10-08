import { describe, expect, it } from "vitest";
import { parseConceptDoc, type ConceptDoc } from "./concept-schema";
import { diffDocs } from "./diff";
import { metricInput } from "./test-fixtures";

function doc(input: unknown): ConceptDoc {
  const r = parseConceptDoc(input);
  if (!r.ok) throw new Error(JSON.stringify(r.issues));
  return r.doc;
}

describe("diffDocs", () => {
  it("returns nothing for identical documents", () => {
    expect(diffDocs(doc(metricInput), doc(metricInput))).toEqual([]);
  });

  it("reports changed scalar and array fields", () => {
    const before = doc(metricInput);
    const changed = structuredClone(metricInput) as any;
    changed.metric.qualifiers.reinsuranceBasis = "NET";
    changed.labels.en.alt = ["Claims ratio"];
    const changes = diffDocs(before, doc(changed));
    expect(changes).toEqual(
      expect.arrayContaining([
        { path: "metric.qualifiers.reinsuranceBasis", before: "GROSS", after: "NET" },
        { path: "labels.en.alt", before: undefined, after: "Claims ratio" },
      ]),
    );
    expect(changes).toHaveLength(2);
  });

  it("treats a missing previous version as all-new", () => {
    const changes = diffDocs(null, doc(metricInput));
    expect(changes.every((c) => c.before === undefined)).toBe(true);
    expect(changes.find((c) => c.path === "metric.components")?.after).toBe(
      "NUMERATOR · gross-claims-incurred\nDENOMINATOR · gross-earned-premium",
    );
  });
});
