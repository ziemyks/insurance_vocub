import {
  ACCOUNTING_BASIS,
  ADDITIVITY,
  AGGREGATION,
  canCertify,
  canProposeChange,
  COMPONENT_ROLE,
  DOMAINS,
  INCLUSION,
  INCLUSION_ITEM,
  METRIC_UNIT,
  POLARITY,
  PREMIUM_BASIS,
  REFRESH_FREQUENCY,
  REINSURANCE_BASIS,
  RELATION_TYPE,
  TIME_BASIS,
  type Lang,
} from "@vocab/core";
import { getConcept, listComments, userNames } from "@vocab/db";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { certifyAction, commentAction, deprecateAction } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { StatusBadge, TypeBadge } from "@/components/Badges";
import { formatDate, formatDateTime, label, names } from "@/lib/format";
import { getI18n } from "@/lib/i18n";
import { requireUser } from "@/lib/session";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getConcept((await params).slug);
  return { title: c ? c.preferredEn : "Not found" };
}

function Bilingual({ value, locale }: { value?: { lv?: string; en?: string }; locale: Lang }) {
  const order: Lang[] = locale === "lv" ? ["lv", "en"] : ["en", "lv"];
  return (
    <div className="bilingual">
      {order.map((l) => (
        <div key={l}>
          <div className="lang-tag">{l.toUpperCase()}</div>
          <p style={{ whiteSpace: "pre-wrap" }}>{value?.[l] || "—"}</p>
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export default async function ConceptPage({ params }: Props) {
  const { slug } = await params;
  const { actor } = await requireUser();
  const { t, locale, other } = await getI18n();
  const concept = await getConcept(slug);
  if (!concept) notFound();

  const doc = concept.doc;
  const m = doc.metric;
  const n = names(concept, locale);
  const domain = DOMAINS.find((d) => d.key === concept.domain.key)!;
  const comments = await listComments({ conceptSlug: slug });
  const people = await userNames(concept.revisions.flatMap((r) => [r.authorId, r.approvedById]));
  const mayPropose =
    canProposeChange(actor, concept.domain.key).allowed && concept.status !== "DEPRECATED";
  const mayCertify =
    canCertify(actor, concept.domain.key).allowed && concept.status !== "DEPRECATED";
  const replacedBy = concept.relationsFrom.find((r) => r.type === "REPLACED_BY");
  const labelsOf = (l: Lang) => doc.labels[l];
  const synonyms = [
    ...labelsOf(locale).alt,
    ...labelsOf(other).alt.map((a) => `${a} (${other.toUpperCase()})`),
  ];
  const abbrevs = [...labelsOf("lv").abbrev, ...labelsOf("en").abbrev].filter(
    (a, i, all) => all.findIndex((b) => b.toLowerCase() === a.toLowerCase()) === i,
  );

  return (
    <div className="stack">
      {concept.status === "CANDIDATE" && <p className="banner">{t.concept.candidateBanner}</p>}
      {concept.status === "DEPRECATED" && (
        <p className="banner error">
          {t.concept.deprecatedBanner}{" "}
          {replacedBy && (
            <>
              {t.concept.replacedBy}:{" "}
              <Link href={`/concepts/${replacedBy.to.slug}`}>
                {names(replacedBy.to, locale).main}
              </Link>
            </>
          )}
        </p>
      )}

      <header className="spread">
        <div>
          <div className="eyebrow">
            <Link href={`/domains/${domain.key}`}>{domain.name[locale]}</Link>
          </div>
          <h1 data-testid="concept-title">
            {n.main} <span className="sub">/ {n.sub}</span>
          </h1>
          <div className="row">
            <TypeBadge type={concept.type} locale={locale} />
            <StatusBadge status={concept.status} locale={locale} />
            {abbrevs.map((a) => (
              <span key={a} className="badge">
                {a}
              </span>
            ))}
            <code className="small muted">{concept.slug}</code>
          </div>
        </div>
        {mayPropose && (
          <Link className="btn" href={`/changes/new?slug=${concept.slug}`}>
            {t.concept.proposeChange}
          </Link>
        )}
      </header>

      <div className="two-col">
        <div className="stack">
          <Section title={t.concept.definition}>
            <Bilingual value={doc.definition} locale={locale} />
            {synonyms.length > 0 && (
              <p className="small">
                <strong>{t.concept.synonyms}:</strong> {synonyms.join(", ")}
              </p>
            )}
          </Section>

          {m && (
            <Section title={t.concept.calculation}>
              <div className="formula" data-testid="formula">
                {m.formula}
              </div>
              {m.components.length > 0 && (
                <>
                  <h3 style={{ marginTop: "1rem" }}>{t.concept.components}</h3>
                  <ul className="list">
                    {m.components.map((c) => {
                      const target = concept.components.find(
                        (x) => x.component.slug === c.metric,
                      )?.component;
                      return (
                        <li key={`${c.role}-${c.metric}`}>
                          <span className="badge">{label(COMPONENT_ROLE, c.role, locale)}</span>{" "}
                          <Link href={`/concepts/${c.metric}`}>
                            {target ? names(target, locale).main : c.metric}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
              <h3 style={{ marginTop: "1rem" }}>{t.concept.qualifiers}</h3>
              <dl className="props">
                <dt>{t.concept.q.accounting}</dt>
                <dd>{label(ACCOUNTING_BASIS, m.qualifiers.accountingBasis, locale)}</dd>
                <dt>{t.concept.q.reinsurance}</dt>
                <dd>{label(REINSURANCE_BASIS, m.qualifiers.reinsuranceBasis, locale)}</dd>
                <dt>{t.concept.q.premium}</dt>
                <dd>{label(PREMIUM_BASIS, m.qualifiers.premiumBasis, locale)}</dd>
                <dt>{t.concept.q.time}</dt>
                <dd>{label(TIME_BASIS, m.qualifiers.timeBasis, locale)}</dd>
                {Object.entries(m.qualifiers.inclusions).map(([k, v]) => (
                  <FragmentRow
                    key={k}
                    term={label(INCLUSION_ITEM, k, locale)}
                    value={label(INCLUSION, v, locale)}
                  />
                ))}
              </dl>
              <h3 style={{ marginTop: "1rem" }}>{t.concept.properties}</h3>
              <dl className="props">
                <dt>{t.concept.unit}</dt>
                <dd>{label(METRIC_UNIT, m.unit, locale)}</dd>
                <dt>{t.concept.aggregation}</dt>
                <dd>{label(AGGREGATION, m.aggregation, locale)}</dd>
                <dt>{t.concept.additivity}</dt>
                <dd>{label(ADDITIVITY, m.additivity, locale)}</dd>
                <dt>{t.concept.polarity}</dt>
                <dd>{label(POLARITY, m.polarity, locale)}</dd>
                {m.grain && <FragmentRow term={t.concept.grain} value={m.grain} />}
                {m.dimensions.length > 0 && (
                  <FragmentRow term={t.concept.dimensions} value={m.dimensions.join(", ")} />
                )}
                {m.refreshFrequency && (
                  <FragmentRow
                    term={t.concept.refresh}
                    value={label(REFRESH_FREQUENCY, m.refreshFrequency, locale)}
                  />
                )}
                {m.target && <FragmentRow term={t.concept.target} value={m.target} />}
              </dl>
              {m.example && (
                <>
                  <h3 style={{ marginTop: "1rem" }}>{t.concept.example}</h3>
                  <Bilingual value={m.example} locale={locale} />
                </>
              )}
            </Section>
          )}

          {m && (
            <Section title={t.concept.implementation}>
              {m.powerBi && (
                <p>
                  <strong>{t.concept.powerBi}:</strong> {m.powerBi.dataset} /{" "}
                  <code>[{m.powerBi.measure}]</code>
                </p>
              )}
              {m.dax && (
                <>
                  <h3>{t.concept.dax}</h3>
                  <pre>{m.dax}</pre>
                </>
              )}
              {m.referenceSql && (
                <>
                  <h3>{t.concept.referenceSql}</h3>
                  <pre>{m.referenceSql}</pre>
                </>
              )}
              {!m.powerBi && !m.dax && !m.referenceSql && (
                <p className="muted">{t.concept.notImplemented}</p>
              )}
            </Section>
          )}

          {(doc.examples?.lv || doc.examples?.en) && (
            <Section title={t.concept.examples}>
              <Bilingual value={doc.examples} locale={locale} />
            </Section>
          )}
          {(doc.notes?.lv || doc.notes?.en) && (
            <Section title={t.concept.notes}>
              <Bilingual value={doc.notes} locale={locale} />
            </Section>
          )}

          {(concept.relationsFrom.length > 0 ||
            concept.relationsTo.length > 0 ||
            concept.usedIn.length > 0) && (
            <Section title={t.concept.relations}>
              <dl className="props">
                {RELATION_TYPE.values.map((type) => {
                  const rel = concept.relationsFrom.filter((r) => r.type === type);
                  return rel.length ? (
                    <FragmentRow
                      key={type}
                      term={label(RELATION_TYPE, type, locale)}
                      value={<LinkList items={rel.map((r) => r.to)} locale={locale} />}
                    />
                  ) : null;
                })}
                {concept.usedIn.length > 0 && (
                  <FragmentRow
                    term={t.concept.usedBy}
                    value={<LinkList items={concept.usedIn.map((u) => u.metric)} locale={locale} />}
                  />
                )}
                {concept.relationsTo.length > 0 && (
                  <FragmentRow
                    term={t.concept.referencedBy}
                    value={
                      <LinkList items={concept.relationsTo.map((r) => r.from)} locale={locale} />
                    }
                  />
                )}
              </dl>
            </Section>
          )}

          {(doc.sources.length > 0 || doc.tags.length > 0) && (
            <Section title={t.concept.sources}>
              <ul>
                {doc.sources.map((s, i) => (
                  <li key={i}>
                    {s.url ? <a href={s.url}>{s.title}</a> : s.title}
                    {s.reference && <span className="muted">, {s.reference}</span>}
                  </li>
                ))}
              </ul>
              {doc.tags.length > 0 && (
                <div className="row">
                  {doc.tags.map((tag) => (
                    <span key={tag} className="badge">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </Section>
          )}

          <Section title={t.concept.comments}>
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
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="path" value={`/concepts/${slug}`} />
              <div className="field">
                <textarea
                  name="body"
                  placeholder={t.concept.commentPlaceholder}
                  aria-label={t.concept.addComment}
                  required
                />
              </div>
            </ActionForm>
          </Section>
        </div>

        <aside className="stack">
          <section className="card">
            <h3>{t.concept.governance}</h3>
            <dl className="props small">
              <dt>{t.concept.domain}</dt>
              <dd>{domain.name[locale]}</dd>
              <dt>{t.concept.owner}</dt>
              <dd>{concept.domain.owner?.name ?? "—"}</dd>
              <dt>{t.concept.steward}</dt>
              <dd>{concept.domain.steward?.name ?? "—"}</dd>
              <dt>{t.concept.status}</dt>
              <dd>
                <StatusBadge status={concept.status} locale={locale} />
              </dd>
              <dt>{t.concept.revision}</dt>
              <dd>{concept.revision}</dd>
              <dt>{t.concept.approvedAt}</dt>
              <dd>{formatDate(concept.approvedAt, locale)}</dd>
              <dt>{t.concept.reviewDue}</dt>
              <dd>{formatDate(concept.reviewDueAt, locale)}</dd>
            </dl>
          </section>

          {concept.changes.length > 0 && (
            <section className="card">
              <h3>{t.concept.openChanges}</h3>
              <ul className="list small">
                {concept.changes.map((c) => (
                  <li key={c.id}>
                    <Link href={`/changes/${c.number}`}>#{c.number}</Link>{" "}
                    <StatusBadge status={c.status} locale={locale} kind="change" />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {mayCertify && (
            <section className="card">
              <h3>{concept.status === "APPROVED" ? t.concept.recertify : t.concept.certify}</h3>
              <ActionForm
                action={certifyAction}
                submitLabel={
                  concept.status === "APPROVED" ? t.concept.recertify : t.concept.certify
                }
              >
                <input type="hidden" name="slug" value={slug} />
                <div className="field">
                  <label htmlFor="note">{t.concept.certifyNote}</label>
                  <input id="note" type="text" name="note" />
                </div>
              </ActionForm>
            </section>
          )}

          {mayPropose && (
            <details className="card">
              <summary>
                <strong>{t.concept.deprecate}</strong>
              </summary>
              <ActionForm
                action={deprecateAction}
                submitLabel={t.concept.deprecate}
                submitClassName="btn danger small"
              >
                <input type="hidden" name="slug" value={slug} />
                <div className="field">
                  <label htmlFor="replacedBy">{t.concept.replacedBy}</label>
                  <input
                    id="replacedBy"
                    type="text"
                    name="replacedBy"
                    placeholder={t.form.target}
                  />
                </div>
                <div className="field">
                  <label htmlFor="dep-reason">{t.change.reason}</label>
                  <textarea id="dep-reason" name="reason" required />
                </div>
              </ActionForm>
            </details>
          )}

          <section className="card">
            <h3>{t.concept.history}</h3>
            <ol className="timeline small">
              {concept.revisions.map((r) => (
                <li key={r.number}>
                  <Link href={`/concepts/${slug}/revisions/${r.number}`}>
                    {t.concept.viewRevision(r.number)}
                  </Link>{" "}
                  <StatusBadge status={r.status} locale={locale} />
                  <div className="muted">
                    {formatDateTime(r.createdAt, locale)}
                    {r.authorId && ` · ${people.get(r.authorId)}`}
                    {r.approvedById &&
                      r.approvedById !== r.authorId &&
                      ` → ${people.get(r.approvedById)}`}
                  </div>
                  {r.note && <div>{r.note}</div>}
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}

function FragmentRow({ term, value }: { term: string; value: ReactNode }) {
  return (
    <>
      <dt>{term}</dt>
      <dd>{value}</dd>
    </>
  );
}

function LinkList({
  items,
  locale,
}: {
  items: { slug: string; preferredLv: string; preferredEn: string }[];
  locale: Lang;
}) {
  return (
    <span>
      {items.map((it, i) => (
        <span key={it.slug}>
          {i > 0 && ", "}
          <Link href={`/concepts/${it.slug}`}>{names(it, locale).main}</Link>
        </span>
      ))}
    </span>
  );
}
