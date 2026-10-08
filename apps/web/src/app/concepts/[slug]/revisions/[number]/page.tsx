import { diffDocs } from "@vocab/core";
import { getRevision, userNames } from "@vocab/db";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/Badges";
import { DiffTable } from "@/components/DiffTable";
import { formatDateTime } from "@/lib/format";
import { getI18n } from "@/lib/i18n";
import { requireUser } from "@/lib/session";

type Props = { params: Promise<{ slug: string; number: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  return { title: `${p.slug} v${p.number}` };
}

/** One immutable revision, shown as a diff against the revision before it. */
export default async function RevisionPage({ params }: Props) {
  await requireUser();
  const { t, locale } = await getI18n();
  const { slug, number } = await params;
  const n = Number(number);
  const revision = Number.isInteger(n) ? await getRevision(slug, n) : null;
  if (!revision) notFound();
  const [previous, next] = await Promise.all([
    n > 1 ? getRevision(slug, n - 1) : null,
    getRevision(slug, n + 1),
  ]);
  const people = await userNames([revision.authorId, revision.approvedById]);

  return (
    <div className="stack">
      <div>
        <Link href={`/concepts/${slug}`}>← {slug}</Link>
        <h1>
          {t.concept.viewRevision(n)} <StatusBadge status={revision.status} locale={locale} />
        </h1>
        <p className="muted">
          {formatDateTime(revision.createdAt, locale)}
          {revision.authorId && ` · ${people.get(revision.authorId)}`}
          {revision.approvedById && ` → ${people.get(revision.approvedById)}`}
          {revision.note && ` · ${revision.note}`}
        </p>
        <div className="row">
          {n > 1 && (
            <Link className="btn secondary small" href={`/concepts/${slug}/revisions/${n - 1}`}>
              ← v{n - 1}
            </Link>
          )}
          {next && (
            <Link className="btn secondary small" href={`/concepts/${slug}/revisions/${n + 1}`}>
              v{n + 1} →
            </Link>
          )}
        </div>
      </div>
      <section className="card">
        <h2>{t.concept.compareWithPrevious}</h2>
        <DiffTable
          changes={diffDocs(previous?.doc ?? null, revision.doc)}
          labels={{
            field: t.change.field,
            before: previous ? `v${n - 1}` : "—",
            after: `v${n}`,
            none: t.change.noDiff,
          }}
        />
      </section>
    </div>
  );
}
