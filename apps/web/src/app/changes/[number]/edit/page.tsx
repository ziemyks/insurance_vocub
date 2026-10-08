import { canEditChange } from "@vocab/core";
import { getChangeByNumber } from "@vocab/db";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ConceptForm } from "@/components/ConceptForm";
import { conceptOptions } from "@/lib/concept-options";
import { getI18n } from "@/lib/i18n";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Edit change request" };

export default async function EditChangePage({ params }: { params: Promise<{ number: string }> }) {
  const { actor } = await requireUser();
  const { t, locale } = await getI18n();
  const number = Number((await params).number);
  const change = Number.isInteger(number) ? await getChangeByNumber(number) : null;
  if (!change) notFound();
  const ctx = { authorId: change.authorId, status: change.status, domains: [change.domain.key] };
  if (!canEditChange(actor, ctx).allowed || change.kind === "DEPRECATE")
    redirect(`/changes/${number}`);

  return (
    <div className="stack">
      <h1>
        {t.change.editTitle} #{change.number}
      </h1>
      <ConceptForm
        locale={locale}
        t={t.form}
        reasonLabels={{ reason: t.change.reason, help: t.change.reasonHelp }}
        mode="edit"
        initial={change.doc}
        reason={change.reason}
        changeId={change.id}
        changeNumber={change.number}
        concepts={await conceptOptions(locale)}
      />
    </div>
  );
}
