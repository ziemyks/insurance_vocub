import { describe, expect, it } from "vitest";
import { parseConceptDoc } from "./concept-schema";
import { buildSearchText, normalizeForSearch } from "./normalize";
import { termInput } from "./test-fixtures";

describe("normalizeForSearch", () => {
  it("strips Latvian diacritics and case", () => {
    expect(normalizeForSearch("Zaudējumu  Koeficients")).toBe("zaudejumu koeficients");
    expect(normalizeForSearch("ĀČĒĢĪĶĻŅŠŪŽ āčēģīķļņšūž")).toBe("acegiklnsuz acegiklnsuz");
  });

  it("builds label and full search text", () => {
    const r = parseConceptDoc(termInput);
    if (!r.ok) throw new Error("fixture invalid");
    const { labelText, fullText } = buildSearchText(r.doc);
    expect(labelText).toContain("pasrisks");
    expect(labelText).toContain("excess");
    expect(fullText).toContain("apdrosinajuma nemejs");
    expect(fullText.startsWith(labelText)).toBe(true);
  });
});
