import { DOMAINS } from "@vocab/core";
import { searchConcepts } from "@vocab/db";
import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge, TypeBadge } from "@/components/Badges";
import { names } from "@/lib/format";
import { getI18n } from "@/lib/i18n";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; domain?: string }>;
}) {
  await requireUser();
  const { t, locale } = await getI18n();
  const { q = "", type, domain } = await searchParams;
  const conceptType = type === "TERM" || type === "METRIC" ? type : undefined;
  const hits = q.trim()
    ? await searchConcepts(q, {
        type: conceptType,
        domain: DOMAINS.some((d) => d.key === domain) ? domain : undefined,
      })
    : [];

  return (
    <div className="stack">
      <form className="row" action="/search">
        <input type="hidden" name="q" value={q} />
        <select
          name="type"
          defaultValue={conceptType ?? ""}
          aria-label="Type"
          style={{ width: "auto" }}
        >
          <option value="">{t.search.allTypes}</option>
          <option value="TERM">{t.common.term}</option>
          <option value="METRIC">{t.common.metric}</option>
        </select>
        <select
          name="domain"
          defaultValue={domain ?? ""}
          aria-label="Domain"
          style={{ width: "auto" }}
        >
          <option value="">{t.search.allDomains}</option>
          {DOMAINS.map((d) => (
            <option key={d.key} value={d.key}>
              {d.name[locale]}
            </option>
          ))}
        </select>
        <button className="btn secondary small">{t.search.button}</button>
      </form>
      {q.trim() && <h1>{t.search.results(hits.length, q)}</h1>}
      {q.trim() && !hits.length && <p className="muted">{t.search.none}</p>}
      <ul className="list card" data-testid="search-results">
        {hits.map((h) => {
          const n = names(h, locale);
          return (
            <li key={h.slug}>
              <div className="row">
                <Link href={`/concepts/${h.slug}`} className="hit-title">
                  {n.main}
                </Link>
                <span className="muted">{n.sub}</span>
                <TypeBadge type={h.type} locale={locale} />
                {h.status !== "APPROVED" && <StatusBadge status={h.status} locale={locale} />}
                <span className="small muted">
                  {DOMAINS.find((d) => d.key === h.domain)?.name[locale]}
                </span>
              </div>
              <p className="small" style={{ margin: "0.25rem 0 0" }}>
                {h.definition[locale]}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
