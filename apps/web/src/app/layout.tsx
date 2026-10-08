import { isAdmin } from "@vocab/core";
import { getActor, getUser } from "@vocab/db";
import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { setLocaleAction, signOutAction } from "@/app/actions";
import { appEnv } from "@/lib/env";
import { getI18n } from "@/lib/i18n";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin", "latin-ext"],
  variable: "--font-source-sans",
  display: "swap",
});

const isTest = appEnv() === "test";
const appTitle = `${isTest ? "[TEST] " : ""}Business Vocabulary`;

export const metadata: Metadata = {
  title: { default: appTitle, template: `%s · ${appTitle}` },
  description: "Insurance business terms and metrics (LV/EN)",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { locale, t } = await getI18n();
  const session = await auth();
  const user = session?.user?.id ? await getUser(session.user.id) : null;
  const admin = user ? isAdmin(await getActor(user.id)) : false;

  return (
    <html lang={locale} className={sourceSans.variable}>
      <body>
        {isTest && (
          <div className="env-banner" role="status" data-testid="env-banner">
            {t.env.test}
          </div>
        )}
        <header className="header">
          <div className="header-inner">
            <Link href="/" className="brand">
              <strong>{t.appName}</strong>
              <span>{t.appTagline}</span>
            </Link>
            {user && (
              <nav className="nav" aria-label="Main">
                <Link href="/">{t.nav.browse}</Link>
                <Link href="/changes">{t.nav.changes}</Link>
                <Link href="/changes/new">{t.nav.propose}</Link>
                {admin && <Link href="/admin">{t.nav.admin}</Link>}
              </nav>
            )}
            <form action={setLocaleAction} className="locale" aria-label="Language">
              {(["lv", "en"] as const).map((l) => (
                <button key={l} name="locale" value={l} aria-pressed={locale === l}>
                  {t.common[l]}
                </button>
              ))}
            </form>
            {user && (
              <form action={signOutAction} className="nav">
                <span className="user">{user.name}</span>
                <button className="link">{t.nav.signOut}</button>
              </form>
            )}
          </div>
        </header>
        {user && (
          <div className="searchbar">
            <form action="/search" role="search">
              <input
                type="search"
                name="q"
                placeholder={t.search.placeholder}
                aria-label={t.search.button}
              />
              <button className="btn accent">{t.search.button}</button>
            </form>
          </div>
        )}
        <main>{children}</main>
      </body>
    </html>
  );
}
