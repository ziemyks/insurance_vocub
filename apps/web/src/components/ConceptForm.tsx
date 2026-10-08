"use client";

import {
  ACCOUNTING_BASIS,
  ADDITIVITY,
  AGGREGATION,
  COMPONENT_ROLE,
  CONCEPT_TYPE,
  DOMAINS,
  INCLUSION,
  INCLUSION_ITEM,
  METRIC_UNIT,
  parseConceptDoc,
  POLARITY,
  PREMIUM_BASIS,
  REFRESH_FREQUENCY,
  REINSURANCE_BASIS,
  RELATION_TYPE,
  TIME_BASIS,
  type ConceptDoc,
  type Lang,
  type ValidationIssue,
} from "@vocab/core";
import { useActionState, useMemo, useState, type ReactNode } from "react";
import { saveChangeAction, type ActionState } from "@/app/actions";
import type { Messages } from "@/lib/messages";

type Vocab = { values: readonly string[]; labels: Record<string, { lv: string; en: string }> };
type Bi = { lv: string; en: string };
const LANGS: Lang[] = ["lv", "en"];
const INCLUSION_KEYS = INCLUSION_ITEM.values;

interface Draft {
  slug: string;
  type: string;
  domain: string;
  labels: Record<Lang, { preferred: string; alt: string; abbrev: string }>;
  definition: Bi;
  examples: Bi;
  notes: Bi;
  relations: { type: string; target: string }[];
  sources: { title: string; reference: string; url: string }[];
  tags: string;
  metric: {
    formula: string;
    unit: string;
    aggregation: string;
    additivity: string;
    polarity: string;
    reinsuranceBasis: string;
    premiumBasis: string;
    timeBasis: string;
    accountingBasis: string;
    inclusions: Record<string, string>;
    grain: string;
    dimensions: string;
    components: { role: string; metric: string }[];
    refreshFrequency: string;
    target: string;
    dax: string;
    referenceSql: string;
    pbiDataset: string;
    pbiMeasure: string;
    example: Bi;
  };
}

const bi = (v?: { lv?: string; en?: string }): Bi => ({ lv: v?.lv ?? "", en: v?.en ?? "" });

function toDraft(doc: ConceptDoc | null, domain: string): Draft {
  const m = doc?.metric;
  return {
    slug: doc?.slug ?? "",
    type: doc?.type ?? "TERM",
    domain: doc?.domain ?? domain,
    labels: {
      lv: {
        preferred: doc?.labels.lv.preferred ?? "",
        alt: doc?.labels.lv.alt.join("\n") ?? "",
        abbrev: doc?.labels.lv.abbrev.join(", ") ?? "",
      },
      en: {
        preferred: doc?.labels.en.preferred ?? "",
        alt: doc?.labels.en.alt.join("\n") ?? "",
        abbrev: doc?.labels.en.abbrev.join(", ") ?? "",
      },
    },
    definition: bi(doc?.definition),
    examples: bi(doc?.examples),
    notes: bi(doc?.notes),
    relations: doc?.relations.map((r) => ({ ...r })) ?? [],
    sources:
      doc?.sources.map((s) => ({
        title: s.title,
        reference: s.reference ?? "",
        url: s.url ?? "",
      })) ?? [],
    tags: doc?.tags.join(", ") ?? "",
    metric: {
      formula: m?.formula ?? "",
      unit: m?.unit ?? "",
      aggregation: m?.aggregation ?? "",
      additivity: m?.additivity ?? "",
      polarity: m?.polarity ?? "",
      reinsuranceBasis: m?.qualifiers.reinsuranceBasis ?? "",
      premiumBasis: m?.qualifiers.premiumBasis ?? "",
      timeBasis: m?.qualifiers.timeBasis ?? "",
      accountingBasis: m?.qualifiers.accountingBasis ?? "",
      inclusions: { ...(m?.qualifiers.inclusions ?? {}) } as Record<string, string>,
      grain: m?.grain ?? "",
      dimensions: m?.dimensions.join(", ") ?? "",
      components: m?.components.map((c) => ({ ...c })) ?? [],
      refreshFrequency: m?.refreshFrequency ?? "",
      target: m?.target ?? "",
      dax: m?.dax ?? "",
      referenceSql: m?.referenceSql ?? "",
      pbiDataset: m?.powerBi?.dataset ?? "",
      pbiMeasure: m?.powerBi?.measure ?? "",
      example: bi(m?.example),
    },
  };
}

const opt = (v: string) => (v.trim() ? v.trim() : undefined);
const list = (v: string, sep: RegExp) =>
  v
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean);
const optBi = (v: Bi) =>
  v.lv.trim() || v.en.trim() ? { lv: opt(v.lv), en: opt(v.en) } : undefined;

/** Converts the editable draft into the concept document shape. */
function toDoc(d: Draft) {
  const m = d.metric;
  return {
    slug: d.slug.trim(),
    type: d.type,
    domain: d.domain,
    labels: Object.fromEntries(
      LANGS.map((l) => [
        l,
        {
          preferred: d.labels[l].preferred,
          alt: list(d.labels[l].alt, /\n/),
          abbrev: list(d.labels[l].abbrev, /,/),
        },
      ]),
    ),
    definition: d.definition,
    examples: optBi(d.examples),
    notes: optBi(d.notes),
    relations: d.relations
      .filter((r) => r.target.trim())
      .map((r) => ({ type: r.type, target: r.target.trim() })),
    sources: d.sources
      .filter((s) => s.title.trim())
      .map((s) => ({ title: s.title.trim(), reference: opt(s.reference), url: opt(s.url) })),
    tags: list(d.tags, /,/),
    metric:
      d.type === "METRIC"
        ? {
            formula: m.formula,
            unit: opt(m.unit),
            aggregation: opt(m.aggregation),
            additivity: opt(m.additivity),
            polarity: opt(m.polarity),
            qualifiers: {
              reinsuranceBasis: opt(m.reinsuranceBasis),
              premiumBasis: opt(m.premiumBasis),
              timeBasis: opt(m.timeBasis),
              accountingBasis: opt(m.accountingBasis),
              inclusions: Object.fromEntries(Object.entries(m.inclusions).filter(([, v]) => v)),
            },
            grain: opt(m.grain),
            dimensions: list(m.dimensions, /,/),
            components: m.components
              .filter((c) => c.metric.trim())
              .map((c) => ({ role: c.role, metric: c.metric.trim() })),
            refreshFrequency: opt(m.refreshFrequency),
            target: opt(m.target),
            dax: opt(m.dax),
            referenceSql: opt(m.referenceSql),
            powerBi:
              opt(m.pbiDataset) && opt(m.pbiMeasure)
                ? { dataset: m.pbiDataset.trim(), measure: m.pbiMeasure.trim() }
                : undefined,
            example: optBi(m.example),
          }
        : undefined,
  };
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface ConceptFormProps {
  locale: Lang;
  t: Messages["form"];
  reasonLabels: { reason: string; help: string };
  mode: "create" | "update" | "edit";
  initial: ConceptDoc | null;
  defaultDomain?: string;
  reason?: string;
  /** UPDATE: the existing concept's slug. */
  slug?: string;
  changeId?: string;
  changeNumber?: number;
  concepts: { slug: string; type: string; label: string }[];
}

export function ConceptForm(props: ConceptFormProps) {
  const { locale, t, mode } = props;
  const [draft, setDraft] = useState<Draft>(() =>
    toDraft(props.initial, props.defaultDomain ?? DOMAINS[0]!.key),
  );
  const [slugTouched, setSlugTouched] = useState(mode !== "create");
  const [clientIssues, setClientIssues] = useState<ValidationIssue[] | null>(null);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveChangeAction, {});
  const payload = useMemo(() => toDoc(draft), [draft]);

  const issues = clientIssues ?? state.issues ?? [];
  const errorFor = (path: string) =>
    issues.filter((i) => i.path === path || i.path.startsWith(`${path}.`)).map((i) => i.message)[0];
  const update = (fn: (d: Draft) => void) =>
    setDraft((prev) => {
      const next = structuredClone(prev);
      fn(next);
      if (!slugTouched && mode === "create") next.slug = slugify(next.labels.en.preferred);
      return next;
    });

  const lbl = (v: Vocab, value: string) => v.labels[value]?.[locale] ?? value;
  const metricOptions = props.concepts.filter((c) => c.type === "METRIC");

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const r = parseConceptDoc(payload);
        if (!r.ok) {
          e.preventDefault();
          setClientIssues(r.issues);
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          setClientIssues(null);
        }
      }}
      noValidate
    >
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />
      {mode === "update" && <input type="hidden" name="slug" value={props.slug} />}
      {props.changeId && <input type="hidden" name="changeId" value={props.changeId} />}
      {props.changeNumber && <input type="hidden" name="changeNumber" value={props.changeNumber} />}

      {(issues.length > 0 || (state.ok === false && state.message)) && (
        <div className="banner error" role="alert" style={{ marginBottom: "1rem" }}>
          <strong>{state.message && !clientIssues ? state.message : t.errors}</strong>
          {issues.length > 0 && (
            <ul>
              {issues.map((i) => (
                <li key={`${i.path}-${i.message}`}>
                  <code>{i.path || "—"}</code>: {i.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <fieldset>
        <div className="form-grid">
          <Field label={t.type} error={errorFor("type")}>
            <select
              value={draft.type}
              disabled={mode !== "create"}
              onChange={(e) => update((d) => void (d.type = e.target.value))}
            >
              {CONCEPT_TYPE.values.map((v) => (
                <option key={v} value={v}>
                  {lbl(CONCEPT_TYPE, v)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t.domain} error={errorFor("domain")}>
            <select
              value={draft.domain}
              onChange={(e) => update((d) => void (d.domain = e.target.value))}
            >
              {DOMAINS.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.name[locale]}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t.slug} help={t.slugHelp} error={errorFor("slug")}>
            <input
              type="text"
              value={draft.slug}
              readOnly={mode !== "create"}
              onChange={(e) => {
                setSlugTouched(true);
                update((d) => void (d.slug = e.target.value));
              }}
              name="slug-display"
            />
          </Field>
        </div>
      </fieldset>

      <div className="bilingual">
        {LANGS.map((l) => (
          <fieldset key={l}>
            <legend>{l.toUpperCase()}</legend>
            <Field label={t.preferred} error={errorFor(`labels.${l}.preferred`)}>
              <input
                type="text"
                name={`preferred-${l}`}
                value={draft.labels[l].preferred}
                onChange={(e) => update((d) => void (d.labels[l].preferred = e.target.value))}
              />
            </Field>
            <Field label={t.definition} help={t.definitionHelp} error={errorFor(`definition.${l}`)}>
              <textarea
                name={`definition-${l}`}
                value={draft.definition[l]}
                onChange={(e) => update((d) => void (d.definition[l] = e.target.value))}
              />
            </Field>
            <Field label={t.alt}>
              <textarea
                value={draft.labels[l].alt}
                onChange={(e) => update((d) => void (d.labels[l].alt = e.target.value))}
                rows={2}
              />
            </Field>
            <Field label={t.abbrev}>
              <input
                type="text"
                value={draft.labels[l].abbrev}
                onChange={(e) => update((d) => void (d.labels[l].abbrev = e.target.value))}
              />
            </Field>
            <Field label={t.examples}>
              <textarea
                value={draft.examples[l]}
                onChange={(e) => update((d) => void (d.examples[l] = e.target.value))}
                rows={2}
              />
            </Field>
            <Field label={t.notes}>
              <textarea
                value={draft.notes[l]}
                onChange={(e) => update((d) => void (d.notes[l] = e.target.value))}
                rows={2}
              />
            </Field>
          </fieldset>
        ))}
      </div>

      {draft.type === "METRIC" && (
        <fieldset>
          <legend>{t.metric}</legend>
          <Field label={t.fields.formula!} error={errorFor("metric.formula")}>
            <input
              type="text"
              name="formula"
              value={draft.metric.formula}
              onChange={(e) => update((d) => void (d.metric.formula = e.target.value))}
            />
          </Field>
          <p className="help">{t.qualifiersHelp}</p>
          <div className="form-grid">
            {(
              [
                ["reinsuranceBasis", REINSURANCE_BASIS],
                ["premiumBasis", PREMIUM_BASIS],
                ["timeBasis", TIME_BASIS],
                ["accountingBasis", ACCOUNTING_BASIS],
              ] as const
            ).map(([key, vocab]) => (
              <Field key={key} label={t.fields[key]!} error={errorFor(`metric.qualifiers.${key}`)}>
                <Select
                  name={key}
                  vocab={vocab}
                  value={draft.metric[key]}
                  locale={locale}
                  empty={t.notSet}
                  onChange={(v) => update((d) => void (d.metric[key] = v))}
                />
              </Field>
            ))}
            {(
              [
                ["unit", METRIC_UNIT],
                ["aggregation", AGGREGATION],
                ["additivity", ADDITIVITY],
                ["polarity", POLARITY],
                ["refreshFrequency", REFRESH_FREQUENCY],
              ] as const
            ).map(([key, vocab]) => (
              <Field key={key} label={t.fields[key]!} error={errorFor(`metric.${key}`)}>
                <Select
                  name={key}
                  vocab={vocab}
                  value={draft.metric[key]}
                  locale={locale}
                  empty={t.notSet}
                  onChange={(v) => update((d) => void (d.metric[key] = v))}
                />
              </Field>
            ))}
          </div>
          <div className="form-grid">
            {INCLUSION_KEYS.map((k) => (
              <Field key={k} label={lbl(INCLUSION_ITEM, k)}>
                <Select
                  vocab={INCLUSION}
                  value={draft.metric.inclusions[k] ?? ""}
                  locale={locale}
                  empty={t.notSet}
                  onChange={(v) => update((d) => void (d.metric.inclusions[k] = v))}
                />
              </Field>
            ))}
          </div>
          <div className="form-grid">
            <Field label={t.fields.grain!}>
              <input
                type="text"
                value={draft.metric.grain}
                onChange={(e) => update((d) => void (d.metric.grain = e.target.value))}
              />
            </Field>
            <Field label={t.fields.dimensions!}>
              <input
                type="text"
                value={draft.metric.dimensions}
                onChange={(e) => update((d) => void (d.metric.dimensions = e.target.value))}
              />
            </Field>
            <Field label={t.fields.target!}>
              <input
                type="text"
                value={draft.metric.target}
                onChange={(e) => update((d) => void (d.metric.target = e.target.value))}
              />
            </Field>
          </div>
          <h4>{t.fields.components}</h4>
          {draft.metric.components.map((c, i) => (
            <div key={i} className="repeat">
              <Select
                vocab={COMPONENT_ROLE}
                value={c.role}
                locale={locale}
                onChange={(v) => update((d) => void (d.metric.components[i]!.role = v))}
              />
              <input
                type="text"
                list="metric-slugs"
                value={c.metric}
                placeholder={t.target}
                onChange={(e) =>
                  update((d) => void (d.metric.components[i]!.metric = e.target.value))
                }
              />
              <button
                type="button"
                className="btn secondary small"
                onClick={() => update((d) => void d.metric.components.splice(i, 1))}
              >
                {t.remove}
              </button>
            </div>
          ))}
          {errorFor("metric.components") && (
            <p className="field-error">{errorFor("metric.components")}</p>
          )}
          <button
            type="button"
            className="btn secondary small"
            onClick={() =>
              update((d) => void d.metric.components.push({ role: "NUMERATOR", metric: "" }))
            }
          >
            + {t.add}
          </button>
          <div className="bilingual" style={{ marginTop: "1rem" }}>
            {LANGS.map((l) => (
              <Field key={l} label={`${t.fields.example} (${l.toUpperCase()})`}>
                <textarea
                  rows={2}
                  value={draft.metric.example[l]}
                  onChange={(e) => update((d) => void (d.metric.example[l] = e.target.value))}
                />
              </Field>
            ))}
          </div>
          <div className="form-grid">
            <Field label={`Power BI — ${t.datasetMeasure}`}>
              <div className="row" style={{ flexWrap: "nowrap" }}>
                <input
                  type="text"
                  value={draft.metric.pbiDataset}
                  placeholder="Dataset"
                  onChange={(e) => update((d) => void (d.metric.pbiDataset = e.target.value))}
                />
                <input
                  type="text"
                  value={draft.metric.pbiMeasure}
                  placeholder="Measure"
                  onChange={(e) => update((d) => void (d.metric.pbiMeasure = e.target.value))}
                />
              </div>
            </Field>
          </div>
          <Field label={t.fields.dax!}>
            <textarea
              className="code"
              value={draft.metric.dax}
              onChange={(e) => update((d) => void (d.metric.dax = e.target.value))}
            />
          </Field>
          <Field label={t.fields.referenceSql!}>
            <textarea
              className="code"
              value={draft.metric.referenceSql}
              onChange={(e) => update((d) => void (d.metric.referenceSql = e.target.value))}
            />
          </Field>
        </fieldset>
      )}

      <fieldset>
        <legend>{t.relations}</legend>
        {draft.relations.map((r, i) => (
          <div key={i} className="repeat">
            <Select
              vocab={RELATION_TYPE}
              value={r.type}
              locale={locale}
              onChange={(v) => update((d) => void (d.relations[i]!.type = v))}
            />
            <input
              type="text"
              list="all-slugs"
              value={r.target}
              placeholder={t.target}
              onChange={(e) => update((d) => void (d.relations[i]!.target = e.target.value))}
            />
            <button
              type="button"
              className="btn secondary small"
              onClick={() => update((d) => void d.relations.splice(i, 1))}
            >
              {t.remove}
            </button>
          </div>
        ))}
        {errorFor("relations") && <p className="field-error">{errorFor("relations")}</p>}
        <button
          type="button"
          className="btn secondary small"
          onClick={() => update((d) => void d.relations.push({ type: "RELATED", target: "" }))}
        >
          + {t.add}
        </button>
      </fieldset>

      <fieldset>
        <legend>{t.sources}</legend>
        {draft.sources.map((s, i) => (
          <div key={i} className="repeat" style={{ gridTemplateColumns: "2fr 1fr 1fr auto" }}>
            <input
              type="text"
              value={s.title}
              placeholder={t.sourceTitle}
              onChange={(e) => update((d) => void (d.sources[i]!.title = e.target.value))}
            />
            <input
              type="text"
              value={s.reference}
              placeholder={t.sourceRef}
              onChange={(e) => update((d) => void (d.sources[i]!.reference = e.target.value))}
            />
            <input
              type="url"
              value={s.url}
              placeholder="https://"
              onChange={(e) => update((d) => void (d.sources[i]!.url = e.target.value))}
            />
            <button
              type="button"
              className="btn secondary small"
              onClick={() => update((d) => void d.sources.splice(i, 1))}
            >
              {t.remove}
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn secondary small"
          onClick={() => update((d) => void d.sources.push({ title: "", reference: "", url: "" }))}
        >
          + {t.add}
        </button>
        <Field label={t.tags}>
          <input
            type="text"
            value={draft.tags}
            onChange={(e) => update((d) => void (d.tags = e.target.value))}
          />
        </Field>
      </fieldset>

      <fieldset>
        <Field label={props.reasonLabels.reason} help={props.reasonLabels.help}>
          <textarea name="reason" defaultValue={props.reason} required />
        </Field>
        <button className="btn" disabled={pending}>
          {pending ? t.saving : t.save}
        </button>
      </fieldset>

      <datalist id="all-slugs">
        {props.concepts.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.label}
          </option>
        ))}
      </datalist>
      <datalist id="metric-slugs">
        {metricOptions.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.label}
          </option>
        ))}
      </datalist>
    </form>
  );
}

function Field({
  label,
  help,
  error,
  children,
}: {
  label: string;
  help?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className={`field${error ? " invalid" : ""}`}>
      <label>
        {label}
        {children}
      </label>
      {help && <div className="help">{help}</div>}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

function Select({
  vocab,
  value,
  onChange,
  locale,
  empty,
  name,
}: {
  vocab: Vocab;
  value: string;
  onChange: (v: string) => void;
  locale: Lang;
  empty?: string;
  name?: string;
}) {
  return (
    <select name={name} value={value} onChange={(e) => onChange(e.target.value)}>
      {empty !== undefined && <option value="">{empty}</option>}
      {vocab.values.map((v) => (
        <option key={v} value={v}>
          {vocab.labels[v]?.[locale] ?? v}
        </option>
      ))}
    </select>
  );
}
