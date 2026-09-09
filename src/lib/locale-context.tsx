"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { Locale } from "@/lib/i18n";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggle: () => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const COOKIE = "locale";

function persist(locale: Locale) {
  try {
    localStorage.setItem(COOKIE, locale);
    // 1 year cookie so SSR can read the preference
    document.cookie = `${COOKIE}=${locale};path=/;max-age=31536000;samesite=lax`;
  } catch {
    /* storage may be unavailable */
  }
}

/**
 * The locale always arrives from the server, resolved from the `locale` cookie
 * in the root layout, so client and server render the same language on the
 * first paint. `setLocale` persists the choice back to that cookie.
 */
export function LocaleProvider({
  initial,
  children,
}: {
  initial: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initial);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    persist(l);
    if (typeof document !== "undefined") {
      document.documentElement.lang = l;
    }
  }, []);

  const toggle = useCallback(() => {
    setLocale(locale === "es" ? "en" : "es");
  }, [locale, setLocale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, toggle }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
