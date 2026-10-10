import { ROLE } from "@vocab/core";
import { db } from "@vocab/db";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, demoCodeRequired, demoMode, devLoginEnabled, entraEnabled } from "@/auth";
import { devSignInAction, entraSignInAction } from "@/app/actions";
import { label } from "@/lib/format";
import { getI18n } from "@/lib/i18n";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if ((await auth())?.user?.id) redirect("/");
  const { error } = await searchParams;
  const { t, locale } = await getI18n();
  const demoUsers = devLoginEnabled
    ? await db().user.findMany({
        where: { email: { endsWith: "@demo.local" } },
        include: { assignments: { include: { domain: true } } },
        orderBy: { email: "asc" },
      })
    : [];

  return (
    <div className="card" style={{ maxWidth: 560, margin: "2rem auto" }}>
      <h1>{t.signin.title}</h1>
      {entraEnabled && (
        <form action={entraSignInAction}>
          <button className="btn">{t.signin.entra}</button>
        </form>
      )}
      {devLoginEnabled && (
        <form action={devSignInAction} className="stack" style={{ marginTop: "1.5rem" }}>
          <p className="banner">
            {demoMode === "code"
              ? t.signin.demoHosted
              : demoMode === "open"
                ? t.signin.demoOpen
                : t.signin.dev}
          </p>
          {error && (
            <p className="banner error" role="alert">
              {t.signin.badCode}
            </p>
          )}
          {demoCodeRequired && (
            <div className="field">
              <label>
                {t.signin.code}
                <input type="password" name="code" required autoComplete="off" />
              </label>
            </div>
          )}
          <ul className="list">
            {demoUsers.map((u) => (
              <li key={u.id} className="spread">
                <div>
                  <strong>{u.name}</strong>
                  <div className="small muted">
                    {u.email} ·{" "}
                    {u.assignments.length
                      ? u.assignments
                          .map(
                            (a) =>
                              `${label(ROLE, a.role, locale)}${a.domain ? ` (${locale === "lv" ? a.domain.nameLv : a.domain.nameEn})` : ""}`,
                          )
                          .join(", ")
                      : label(ROLE, "VIEWER", locale)}
                  </div>
                </div>
                <button
                  name="email"
                  value={u.email}
                  className="btn secondary small"
                  data-testid={`login-${u.email}`}
                >
                  {t.signin.title}
                </button>
              </li>
            ))}
          </ul>
        </form>
      )}
      {!entraEnabled && !devLoginEnabled && <p className="banner error">{t.signin.noProviders}</p>}
    </div>
  );
}
