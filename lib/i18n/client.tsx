"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { DEFAULT_LOCALE, translate, type DictKey, type Locale } from "@/lib/i18n/dictionary";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useT() {
  const locale = useLocale();
  return useCallback(
    (key: DictKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale]
  );
}
