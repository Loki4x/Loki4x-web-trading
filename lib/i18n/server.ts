import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, translate, type TKey, type Locale } from "@/lib/i18n/dictionary";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Penerjemah berdasarkan bahasa yang dipilih penerima (profiles.language), bukan bahasa pengirim. */
export async function getUserT(
  client: { from: (table: string) => any },
  userId: string
) {
  const { data } = await client.from("profiles").select("language").eq("id", userId).single();
  const raw = data?.language;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  return {
    locale,
    t: (key: TKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
  };
}

export async function getT() {
  const locale = await getLocale();
  return {
    locale,
    t: (key: TKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
  };
}
