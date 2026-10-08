import "server-only";
import type { Lang } from "@vocab/core";
import { cookies } from "next/headers";
import { cache } from "react";
import { MESSAGES } from "./messages";

export const LOCALE_COOKIE = "locale";

/** UI language from the cookie; Latvian by default. */
export const getLocale = cache(async (): Promise<Lang> => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return value === "en" ? "en" : "lv";
});

export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: MESSAGES[locale], other: (locale === "lv" ? "en" : "lv") as Lang };
}
