import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, translate, type DictKey, type Locale } from "@/lib/i18n/dictionary";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getT() {
  const locale = await getLocale();
  return {
    locale,
    t: (key: DictKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
  };
}
