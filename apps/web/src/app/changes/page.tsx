import { CHANGE_KIND } from "@vocab/core";
import { listChanges } from "@vocab/db";
import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/Badges";
import { formatDateTime, label } from "@/lib/format";
import { getI18n } from "@/lib/i18n";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Change requests" };

const FILTERS = ["review", "mine", "open", "all"] as const;

export default async function ChangesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { user, actor } = await requireUser();
  const { t, locale } = await getI18n();
  const raw = (await searchParams).filter;
  const filter = FILTERS.find((f) => f === raw) ?? "open";
  const changes = await listChanges(
    filter === "review"
      ? { reviewableBy: actor }
      : filter === "mine"
        ? { authorId: user.id }
        : filter === "open"
          ? { openOnly: true }
          : {},
  );

  return (
    <div className="stack">
      <div className="spread">
        <h1>{t.nav.changes}</h1>
        <Link className="btn" href="/changes/new">
          {t.nav.propose}
        </Link>
      </div>
      <nav className="tabs">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={`/changes?filter=${f}`}
            aria-current={filter === f ? "page" : undefined}
          >
            {t.change.filters[f]}
          </Link>
        ))}
      </nav>
      {!changes.length ? (
        <p className="muted">{t.change.empty}</p>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>{t.change.concept}</th>
                <th>{t.change.kind}</th>
                <th>{t.change.domain}</th>
                <th>{t.change.status}</th>
                <th>{t.change.author}</th>
                <th>{t.change.updated}</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/changes/${c.number}`}>#{c.number}</Link>
                  </td>
                  <td>
                    <Link href={`/changes/${c.number}`}>{c.slug}</Link>
                  </td>
                  <td>{label(CHANGE_KIND, c.kind, locale)}</td>
                  <td>{locale === "lv" ? c.domain.nameLv : c.domain.nameEn}</td>
                  <td>
                    <StatusBadge status={c.status} locale={locale} kind="change" />
                  </td>
                  <td>{c.author.name}</td>
                  <td className="small">{formatDateTime(c.updatedAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
