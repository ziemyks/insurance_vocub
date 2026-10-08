import { DOMAINS, normalizeForSearch } from "@vocab/core";
import { listConcepts, readDoc } from "@vocab/db";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge, TypeBadge } from "@/components/Badges";
import { names } from "@/lib/format";
import { getI18n } from "@/lib/i18n";
import { requireUser } from "@/lib/session";

type Props = {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ type?: string; letter?: string; status?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { key } = await params;
  const d = DOMAINS.find((x) => x.key === key);
  return { title: d?.name.en ?? "Domain" };
}

export default async function DomainPage({ params, searchParams }: Props) {
  await requireUser();
  const { t, locale } = await getI18n();
  const { key } = await params;
  const { type, letter, status } = await searchParams;
  const domain = DOMAINS.find((d) => d.key === key);
  if (!domain) notFound();

  const all = await listConcepts({ domain: key, lang: locale });
  const firstLetter = (c: (typeof all)[number]) =>
    normalizeForSearch(names(c, locale).main).charAt(0).toUpperCase();
  const letters = [...new Set(all.map(firstLetter))].sort();
  const items = all.filter(
    (c) =>
      (!type || c.type === type) &&
      (!status || c.status === status) &&
      (!letter || firstLetter(c) === letter),
  );
  const href = (p: Record<string, string | undefined>) => {
    const qs = new URLSearchParams(
      Object.entries({ type, status, letter, ...p }).filter(([, v]) => v) as [string, string][],
    );
    return `/domains/${key}${qs.size ? `?${qs}` : ""}`;
  };

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <div className="eyebrow">{t.concept.domain}</div>
          <h1>{domain.name[locale]}</h1>
          <p className="muted">{domain.description[locale]}</p>
        </div>
        <Link className="btn" href={`/changes/new?domain=${key}`}>
          {t.nav.propose}
        </Link>
      </div>
      <nav className="tabs" aria-label="Type">
        <Link href={href({ type: undefined })} aria-current={!type ? "page" : undefined}>
          {t.common.all} ({all.length})
        </Link>
        <Link href={href({ type: "TERM" })} aria-current={type === "TERM" ? "page" : undefined}>
          {t.common.term}
        </Link>
        <Link href={href({ type: "METRIC" })} aria-current={type === "METRIC" ? "page" : undefined}>
          {t.common.metric}
        </Link>
        <Link
          href={href({ status: status === "CANDIDATE" ? undefined : "CANDIDATE" })}
          aria-current={status === "CANDIDATE" ? "page" : undefined}
        >
          {t.home.candidates}
        </Link>
      </nav>
      <nav className="letters" aria-label="A–Z">
        <Link href={href({ letter: undefined })} aria-current={!letter}>
          {t.common.all}
        </Link>
        {letters.map((l) => (
          <Link key={l} href={href({ letter: l })} aria-current={letter === l}>
            {l}
          </Link>
        ))}
      </nav>
      <ul className="list card">
        {items.map((c) => {
          const n = names(c, locale);
          return (
            <li key={c.slug}>
              <div className="row">
                <Link href={`/concepts/${c.slug}`} className="hit-title">
                  {n.main}
                </Link>
                <span className="muted">{n.sub}</span>
                <TypeBadge type={c.type} locale={locale} />
                {c.status !== "APPROVED" && <StatusBadge status={c.status} locale={locale} />}
              </div>
              <p className="small" style={{ margin: "0.25rem 0 0" }}>
                {readDoc(c.doc).definition[locale]}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
