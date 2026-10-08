import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DOMAIN_KEYS, parseConceptDoc, referencedSlugs, type ConceptDoc } from "@vocab/core";
import { parse } from "yaml";

export const CONTENT_DIR = fileURLToPath(new URL("../../../content/seed", import.meta.url));

export interface ContentProblem {
  file: string;
  slug?: string;
  message: string;
}

export interface CodeListFile {
  key: string;
  conceptSlug?: string;
  name: { lv: string; en: string };
  description?: { lv?: string; en?: string };
  values: { code: string; lv: string; en: string }[];
}

/** Loads and validates every seed file: schema, file/domain match, unique slugs, references. */
export async function loadContent(dir = CONTENT_DIR) {
  const problems: ContentProblem[] = [];
  const docs: ConceptDoc[] = [];
  const files = (await readdir(dir)).filter((f) => f.endsWith(".yaml")).sort();

  for (const file of files) {
    const domain = path.basename(file, ".yaml");
    let data: { domain?: string; concepts?: unknown[] };
    try {
      data = parse(await readFile(path.join(dir, file), "utf8"));
    } catch (e) {
      problems.push({ file, message: `YAML error: ${(e as Error).message}` });
      continue;
    }
    if (!DOMAIN_KEYS.includes(domain))
      problems.push({ file, message: `File name is not a domain key` });
    if (data?.domain !== domain) problems.push({ file, message: `domain must be "${domain}"` });
    for (const [i, raw] of (data?.concepts ?? []).entries()) {
      const r = parseConceptDoc({ ...(raw as object), domain: data.domain });
      const slug = (raw as { slug?: string })?.slug ?? `#${i + 1}`;
      if (!r.ok) {
        for (const issue of r.issues)
          problems.push({ file, slug, message: `${issue.path}: ${issue.message}` });
      } else {
        docs.push(r.doc);
      }
    }
  }

  const bySlug = new Map<string, ConceptDoc>();
  for (const doc of docs) {
    if (bySlug.has(doc.slug))
      problems.push({ file: `${doc.domain}.yaml`, slug: doc.slug, message: "Duplicate slug" });
    bySlug.set(doc.slug, doc);
  }
  for (const doc of docs) {
    for (const target of referencedSlugs(doc)) {
      if (!bySlug.has(target))
        problems.push({
          file: `${doc.domain}.yaml`,
          slug: doc.slug,
          message: `Unknown reference: ${target}`,
        });
    }
    for (const c of doc.metric?.components ?? []) {
      const t = bySlug.get(c.metric);
      if (t && t.type !== "METRIC")
        problems.push({
          file: `${doc.domain}.yaml`,
          slug: doc.slug,
          message: `Component ${c.metric} is not a metric`,
        });
    }
  }

  const codeLists: CodeListFile[] = [];
  const codeDir = path.join(dir, "code-lists");
  const codeFiles = await readdir(codeDir).catch(() => [] as string[]);
  for (const file of codeFiles.filter((f) => f.endsWith(".yaml")).sort()) {
    const list = parse(await readFile(path.join(codeDir, file), "utf8")) as CodeListFile;
    if (list.conceptSlug && !bySlug.has(list.conceptSlug)) {
      problems.push({ file: `code-lists/${file}`, message: `Unknown concept ${list.conceptSlug}` });
    }
    codeLists.push(list);
  }

  return { docs, codeLists, problems };
}
