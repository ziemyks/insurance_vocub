import { describe, expect, it } from "vitest";
import { parseConceptDoc, referencedSlugs } from "./concept-schema";
import { metricInput, termInput } from "./test-fixtures";

describe("parseConceptDoc", () => {
  it("accepts a term and fills defaults", () => {
    const r = parseConceptDoc(termInput);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.doc.labels.lv.alt).toEqual([]);
      expect(r.doc.relations).toEqual([]);
    }
  });

  it("accepts a metric with all qualifiers", () => {
    expect(parseConceptDoc(metricInput).ok).toBe(true);
  });

  it.each(["reinsuranceBasis", "premiumBasis", "timeBasis", "accountingBasis"])(
    "rejects a metric without the %s qualifier",
    (qualifier) => {
      const input = structuredClone(metricInput) as any;
      delete input.metric.qualifiers[qualifier];
      const r = parseConceptDoc(input);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.issues.map((i) => i.path)).toContain(`metric.qualifiers.${qualifier}`);
    },
  );

  it("requires both languages for the preferred label and definition", () => {
    const input = structuredClone(termInput) as any;
    input.labels.lv.preferred = "  ";
    delete input.definition.en;
    const r = parseConceptDoc(input);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const paths = r.issues.map((i) => i.path);
      expect(paths).toContain("labels.lv.preferred");
      expect(paths).toContain("definition.en");
    }
  });

  it("rejects metric details on a term and a metric without them", () => {
    expect(parseConceptDoc({ ...termInput, metric: metricInput.metric }).ok).toBe(false);
    expect(parseConceptDoc({ ...metricInput, metric: undefined }).ok).toBe(false);
  });

  it("rejects self references and bad slugs", () => {
    expect(
      parseConceptDoc({ ...termInput, relations: [{ type: "RELATED", target: "deductible" }] }).ok,
    ).toBe(false);
    expect(parseConceptDoc({ ...termInput, slug: "Deductible Amount" }).ok).toBe(false);
  });

  it("only accepts http(s) source links", () => {
    const withUrl = (url: string) =>
      parseConceptDoc({ ...termInput, sources: [{ title: "Law", url }] }).ok;
    expect(withUrl("https://likumi.lv/")).toBe(true);
    expect(withUrl("javascript:alert(1)")).toBe(false);
    expect(withUrl("data:text/html,x")).toBe(false);
  });

  it("rejects an unknown domain", () => {
    expect(parseConceptDoc({ ...termInput, domain: "marketing" }).ok).toBe(false);
  });

  it("lists referenced slugs from relations and components", () => {
    const r = parseConceptDoc({
      ...metricInput,
      relations: [{ type: "RELATED", target: "combined-ratio" }],
    });
    expect(r.ok && referencedSlugs(r.doc)).toEqual([
      "combined-ratio",
      "gross-claims-incurred",
      "gross-earned-premium",
    ]);
  });
});
