import { describe, expect, it } from "vitest";
import { parseConceptDoc } from "./concept-schema";
import { assignmentsFromGroups, parseRoleGroupMap } from "./role-map";
import { docToRow, rowToDoc } from "./tabular";
import { metricInput, termInput } from "./test-fixtures";

describe("tabular round trip", () => {
  it.each([
    [
      "term",
      {
        ...termInput,
        relations: [{ type: "RELATED", target: "sum-insured" }],
        tags: ["motor", "property"],
      },
    ],
    [
      "metric",
      {
        ...metricInput,
        sources: [{ title: "IFRS 17 Insurance Contracts", reference: "Appendix A" }],
        metric: {
          ...metricInput.metric!,
          qualifiers: {
            ...metricInput.metric!.qualifiers,
            inclusions: { largeLosses: "INCLUDED", alae: "EXCLUDED" },
          },
          dimensions: ["Line of business", "Month"],
          powerBi: { dataset: "Finance", measure: "Gross Loss Ratio" },
        },
      },
    ],
  ])("preserves a %s", (_, input) => {
    const parsed = parseConceptDoc(input);
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues));
    const back = rowToDoc(docToRow(parsed.doc));
    expect(back).toEqual({ ok: true, doc: parsed.doc });
  });

  it("reports validation issues for incomplete rows", () => {
    const r = rowToDoc({
      slug: "x",
      type: "metric",
      domain: "claims",
      preferred_lv: "X",
      preferred_en: "X",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.map((i) => i.path)).toContain("metric.qualifiers.timeBasis");
  });
});

describe("role group map", () => {
  it("parses single and multiple assignments and merges duplicates", () => {
    const map = parseRoleGroupMap(
      JSON.stringify({
        g1: { role: "ADMIN" },
        g2: [
          { role: "OWNER", domain: "claims" },
          { role: "STEWARD", domain: "premium" },
        ],
        g3: { role: "OWNER", domain: "claims" },
      }),
    );
    expect(assignmentsFromGroups(map, ["g1", "g2", "g3", "unknown"])).toEqual([
      { role: "ADMIN", domain: null },
      { role: "OWNER", domain: "claims" },
      { role: "STEWARD", domain: "premium" },
    ]);
  });

  it("treats an empty value as no mapping and rejects unknown domains", () => {
    expect(parseRoleGroupMap("")).toEqual({});
    expect(() => parseRoleGroupMap('{"g":{"role":"OWNER","domain":"nope"}}')).toThrow();
  });
});
