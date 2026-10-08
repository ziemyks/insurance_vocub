import { availableActions, canEditChange, CHANGE_KIND, diffDocs, DOMAINS } from "@vocab/core";
import { getChangeByNumber, listComments } from "@vocab/db";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { commentAction, rebaseAction } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { StatusBadge, TypeBadge } from "@/components/Badges";
import { DiffTable } from "@/components/DiffTable";
import { WorkflowForm } from "@/components/WorkflowForm";
import { formatDateTime, label } from "@/lib/format";
import { getI18n } from "@/lib/i18n";
import { requireUser } from "@/lib/session";

type Props = { params: Promise<{ number: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `#${(await params).number}` };
}

export default async function ChangePage({ params }: Props) {
  const { actor } = await requireUser();
  const { t, locale } = await getI18n();
  const number = Number((await params).number);
  const change = Number.isInteger(number) ? await getChangeByNumber(number) : null;
  if (!change) notFound();

  const domains = [change.domain.key];
  if (change.concept && change.concept.domain.key !== change.domain.key)
    domains.push(change.concept.domain.key);
  const ctx = { authorId: change.authorId, status: change.status, domains };
  const actions = availableActions(actor, ctx);
  const editable = canEditChange(actor, ctx).allowed && change.kind !== "DEPRECATE";
  const stale =
    change.concept &&
    change.baseRevision !== null &&
    change.concept.revision !== change.baseRevision;
  const open = !["APPROVED", "REJECTED", "WITHDRAWN"].includes(change.status);
  const diff = diffDocs(change.currentDoc, change.doc);
  const comments = await listComments({ changeId: change.id });
  const n = locale === "lv" ? change.doc.labels.lv.preferred : change.doc.labels.en.preferred;

  return (
    <div className="stack">
      <header className="spread">
        <div>
          <div className="eyebrow">
            {t.change.title(change.number)} · {label(CHANGE_KIND, change.kind, locale)}
          </div>
          <h1>
            {change.concept ? <Link href={`/concepts/${change.slug}`}>{n}</Link> : n}{" "}
            <span className="sub">
              / {locale === "lv" ? change.doc.labels.en.preferred : change.doc.labels.lv.preferred}
            </span>
          </h1>
          <div className="row">
            <StatusBadge status={change.status} locale={locale} kind="change" />
            <TypeBadge type={change.doc.type} locale={locale} />
            <span className="small muted">
              {DOMAINS.find((d) => d.key === change.doc.domain)?.name[locale]}
            </span>
          </div>
        </div>
        {editable && (
          <Link className="btn secondary" href={`/changes/${change.number}/edit`}>
            {t.change.edit}
          </Link>
        )}
      </header>

      {stale && open && (
        <div className="banner">
          {t.change.staleWarning(change.baseRevision!, change.concept!.revision)}
          {editable && (
            <ActionForm
              action={rebaseAction}
              submitLabel={t.change.rebase}
              submitClassName="btn secondary small"
            >
              <input type="hidden" name="changeId" value={change.id} />
              <input type="hidden" name="changeNumber" value={change.number} />
            </ActionForm>
          )}
        </div>
      )}

      <div className="two-col">
        <div className="stack">
          <section className="card">
            <h2>{t.change.reason}</h2>
            <p style={{ whiteSpace: "pre-wrap" }}>{change.reason}</p>
            <p className="small muted">
              {t.change.author}: {change.author.name} · {t.change.created}:{" "}
              {formatDateTime(change.createdAt, locale)}
            </p>
          </section>
          <section className="card">
            <h2>{change.currentDoc ? t.change.diff : t.change.proposed}</h2>
            <DiffTable
              changes={diff}
              labels={{
                field: t.change.field,
                before: t.change.before,
                after: t.change.after,
                none: t.change.noDiff,
              }}
            />
          </section>
          <section className="card">
            <h2>{t.concept.comments}</h2>
            {comments.map((c) => (
              <div key={c.id} className="comment">
                <div className="small muted">
                  {c.author.name} · {formatDateTime(c.createdAt, locale)}
                </div>
                {c.body}
              </div>
            ))}
            <ActionForm
              action={commentAction}
              submitLabel={t.concept.addComment}
              submitClassName="btn secondary small"
              resetOnSuccess
            >
              <input type="hidden" name="changeId" value={change.id} />
              <input type="hidden" name="path" value={`/changes/${change.number}`} />
              <div className="field">
                <textarea
                  name="body"
                  placeholder={t.concept.commentPlaceholder}
                  aria-label={t.concept.addComment}
                  required
                />
              </div>
            </ActionForm>
          </section>
        </div>
        <aside className="stack">
          {actions.length > 0 && (
            <section className="card">
              <h3>{t.change.workflow}</h3>
              <WorkflowForm
                changeId={change.id}
                actions={actions}
                labels={t.change.actions}
                commentLabel={t.change.commentForAction}
              />
            </section>
          )}
          <section className="card">
            <h3>{t.concept.history}</h3>
            <ol className="timeline small">
              <li>
                {formatDateTime(change.createdAt, locale)} · {change.author.name}
              </li>
              {change.reviews.map((r) => (
                <li key={r.id}>
                  <strong>{t.change.actions[r.action] ?? r.action}</strong> · {r.actor.name}
                  <div className="muted">{formatDateTime(r.createdAt, locale)}</div>
                  {r.comment && <div style={{ whiteSpace: "pre-wrap" }}>{r.comment}</div>}
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
