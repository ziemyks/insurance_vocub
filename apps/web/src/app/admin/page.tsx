import { DOMAINS, isAdmin, ROLE } from "@vocab/core";
import { db, listUsersWithRoles } from "@vocab/db";
import type { Metadata } from "next";
import { domainPeopleAction, grantRoleAction, importAction, revokeRoleAction } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { ImportForm } from "@/components/ImportForm";
import { label } from "@/lib/format";
import { getI18n } from "@/lib/i18n";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const { actor } = await requireUser();
  const { t, locale } = await getI18n();
  if (!isAdmin(actor)) return <p className="banner error">403</p>;
  const [users, domains] = await Promise.all([
    listUsersWithRoles(),
    db().domain.findMany({ orderBy: { order: "asc" }, include: { owner: true, steward: true } }),
  ]);

  return (
    <div className="stack">
      <h1>{t.admin.title}</h1>

      <div className="two-col">
        <section className="card">
          <h2>{t.admin.roles}</h2>
          <p className="small muted">{t.admin.entraNote}</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t.admin.email}</th>
                  <th>{t.admin.role}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.name}</strong>
                      <div className="small muted">{u.email}</div>
                    </td>
                    <td>
                      {u.assignments.length === 0 && (
                        <span className="muted">{label(ROLE, "VIEWER", locale)}</span>
                      )}
                      {u.assignments.map((a) => (
                        <form key={a.id} action={revokeRoleAction} className="row small">
                          <input type="hidden" name="assignmentId" value={a.id} />
                          <span>
                            {label(ROLE, a.role, locale)} ·{" "}
                            {a.domain
                              ? locale === "lv"
                                ? a.domain.nameLv
                                : a.domain.nameEn
                              : t.admin.allDomains}{" "}
                            <span className="muted">({a.source})</span>
                          </span>
                          {a.source !== "ENTRA" && (
                            <button className="link">{t.admin.revoke}</button>
                          )}
                        </form>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="stack">
          <section className="card">
            <h3>{t.admin.grant}</h3>
            <ActionForm action={grantRoleAction} submitLabel={t.admin.grant}>
              <div className="field">
                <label>
                  {t.admin.email}
                  <input type="email" name="email" required list="user-emails" />
                </label>
              </div>
              <div className="field">
                <label>
                  {t.admin.role}
                  <select name="role">
                    {ROLE.values
                      .filter((r) => r !== "VIEWER")
                      .map((r) => (
                        <option key={r} value={r}>
                          {label(ROLE, r, locale)}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              <div className="field">
                <label>
                  {t.concept.domain}
                  <select name="domain">
                    <option value="">{t.admin.allDomains}</option>
                    {DOMAINS.map((d) => (
                      <option key={d.key} value={d.key}>
                        {d.name[locale]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </ActionForm>
            <datalist id="user-emails">
              {users.map((u) => (
                <option key={u.id} value={u.email} />
              ))}
            </datalist>
          </section>

          <section className="card">
            <h3>{t.admin.exportTitle}</h3>
            <p className="small muted">{t.admin.exportHelp}</p>
            <div className="row">
              <a className="btn secondary small" href="/api/v1/export?format=xlsx">
                Excel
              </a>
              <a className="btn secondary small" href="/api/v1/export?format=csv">
                CSV
              </a>
              <a className="btn secondary small" href="/api/v1/export?format=skos">
                SKOS JSON-LD
              </a>
            </div>
          </section>

          <section className="card">
            <h3>{t.admin.importTitle}</h3>
            <p className="small muted">{t.admin.importHelp}</p>
            <ImportForm action={importAction} label={t.admin.importButton} locale={locale} />
          </section>
        </aside>
      </div>

      <section className="card">
        <h2>{t.admin.domainPeople}</h2>
        <div className="grid">
          {domains.map((d) => (
            <ActionForm
              key={d.id}
              action={domainPeopleAction}
              submitLabel={t.admin.save}
              submitClassName="btn secondary small"
              className="card"
            >
              <h3>{locale === "lv" ? d.nameLv : d.nameEn}</h3>
              <input type="hidden" name="domain" value={d.key} />
              <div className="field">
                <label>
                  {t.concept.owner}
                  <input
                    type="email"
                    name="ownerEmail"
                    defaultValue={d.owner?.email ?? ""}
                    list="user-emails"
                  />
                </label>
              </div>
              <div className="field">
                <label>
                  {t.concept.steward}
                  <input
                    type="email"
                    name="stewardEmail"
                    defaultValue={d.steward?.email ?? ""}
                    list="user-emails"
                  />
                </label>
              </div>
            </ActionForm>
          ))}
        </div>
      </section>
    </div>
  );
}
