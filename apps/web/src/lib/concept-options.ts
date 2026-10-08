import "server-only";
import type { Lang } from "@vocab/core";
import { allSlugs } from "@vocab/db";

/** Options for relation and component pickers in the concept form. */
export async function conceptOptions(locale: Lang) {
  const rows = await allSlugs();
  return rows.map((c) => ({
    slug: c.slug,
    type: c.type,
    label: locale === "lv" ? c.preferredLv : c.preferredEn,
  }));
}
