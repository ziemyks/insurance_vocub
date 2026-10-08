import { canProposeChange, DOMAINS } from "@vocab/core";
import { getConcept } from "@vocab/db";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConceptForm } from "@/components/ConceptForm";
import { conceptOptions } from "@/lib/concept-options";
import { names } from "@/lib/format";
import { getI18n } from "@/lib/i18n";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Propose" };

export default async function NewChangePage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; domain?: string }>;
}) {
  const { actor } = await requireUser();
  const { t, locale } = await getI18n();
  const { slug, domain } = await searchParams;
  const concept = slug ? await getConcept(slug) : null;
  if (slug && !concept) notFound();

  const targetDomain =
    concept?.domain.key ?? (DOMAINS.some((d) => d.key === domain) ? domain : undefined);
  const permitted = targetDomain
    ? canProposeChange(actor, targetDomain)
    : DOMAINS.some((d) => canProposeChange(actor, d.key).allowed)
      ? { allowed: true as const }
      : canProposeChange(actor, DOMAINS[0]!.key);
  if (!permitted.allowed) {
    return <p className="banner error">{permitted.reason}</p>;
  }

  return (
    <div className="stack">
      <h1>
        {concept ? `${t.concept.proposeChange}: ${names(concept, locale).main}` : t.change.newTitle}
      </h1>
      <ConceptForm
        locale={locale}
        t={t.form}
        reasonLabels={{ reason: t.change.reason, help: t.change.reasonHelp }}
        mode={concept ? "update" : "create"}
        initial={concept?.doc ?? null}
        defaultDomain={targetDomain}
        slug={concept?.slug}
        concepts={await conceptOptions(locale)}
      />
    </div>
  );
}
