import { domainSummaries, listChanges, listConcepts, recentRevisions, userNames } from "@vocab/db";
import Link from "next/link";
import { StatusBadge } from "@/components/Badges";
import { formatDate, names } from "@/lib/format";
import { getI18n } from "@/lib/i18n";
import { requireUser } from "@/lib/session";

export default async function HomePage() {
  const { user, actor } = await requireUser();
  const { t, locale } = await getI18n();
  const [domains, toReview, mine, recent, overdue, open] = await Promise.all([
    domainSummaries(),
    listChanges({ reviewableBy: actor, take: 10 }),
    listChanges({ authorId: user.id, openOnly: true, take: 10 }),
    recentRevisions(8),
    listConcepts({ reviewOverdue: true, take: 10 }),
    listChanges({ openOnly: true }),
  ]);
  const authors = await userNames(recent.map((r) => r.authorId));
  const total = domains.reduce((n, d) => n + d.terms + d.metrics, 0);
  const metrics = domains.reduce((n, d) => n + d.metrics, 0);
  const approved = domains.reduce((n, d) => n + d.approved, 0);

  return (
    <div className="stack">
      <section className="card stats" aria-label="Summary">
        {[
          [total, t.home.stats.concepts],
          [metrics, t.home.stats.metrics],
          [approved, t.home.stats.approved],
          [open.length, t.home.stats.open],
        ].map(([n, l]) => (
          <div key={String(l)} className="stat">
            <strong>{n}</strong>
            <span>{l}</span>
          </div>
        ))}
      </section>

      <div className="two-col">
        <section>
          <h2>{t.home.domains}</h2>
          <div className="grid">
            {domains.map((d) => (
              <Link key={d.key} href={`/domains/${d.key}`} className="card domain-card">
                <h3>{locale === "lv" ? d.nameLv : d.nameEn}</h3>
                <p className="small muted">{locale === "lv" ? d.descriptionLv : d.descriptionEn}</p>
                <div className="counts">
                  <strong>{d.terms}</strong> {t.home.terms} · <strong>{d.metrics}</strong>{" "}
                  {t.home.metrics}
                  <br />
                  <span className="muted">
                    {d.approved} {t.home.approved} · {d.candidates} {t.home.candidates}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <aside className="stack">
          <section className="card">
            <h3>{t.home.toReview}</h3>
            <ChangeList items={toReview} empty={t.home.nothing} locale={locale} />
          </section>
          <section className="card">
            <h3>{t.home.myDrafts}</h3>
            <ChangeList items={mine} empty={t.home.nothing} locale={locale} />
          </section>
          <section className="card">
            <h3>{t.home.recent}</h3>
            <ul className="list small">
              {recent.map((r) => (
                <li key={`${r.concept.slug}-${r.number}`}>
                  <Link href={`/concepts/${r.concept.slug}`}>{names(r.concept, locale).main}</Link>{" "}
                  <span className="muted">
                    v{r.number} · {formatDate(r.createdAt, locale)}
                    {r.authorId && ` · ${authors.get(r.authorId)}`}
                  </span>
                  {r.note && <div className="muted">{r.note}</div>}
                </li>
              ))}
            </ul>
          </section>
          {overdue.length > 0 && (
            <section className="card">
              <h3>{t.home.overdue}</h3>
              <ul className="list small">
                {overdue.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/concepts/${c.slug}`}>{names(c, locale).main}</Link>{" "}
                    <span className="muted">{formatDate(c.reviewDueAt, locale)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function ChangeList({
  items,
  empty,
  locale,
}: {
  items: Awaited<ReturnType<typeof listChanges>>;
  empty: string;
  locale: "lv" | "en";
}) {
  if (!items.length) return <p className="muted small">{empty}</p>;
  return (
    <ul className="list small">
      {items.map((c) => (
        <li key={c.id}>
          <Link href={`/changes/${c.number}`}>
            #{c.number} {c.slug}
          </Link>{" "}
          <StatusBadge status={c.status} locale={locale} kind="change" />
          <div className="muted">{c.author.name}</div>
        </li>
      ))}
    </ul>
  );
}
