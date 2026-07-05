"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n";

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

export function LocaleProvider({
  initial,
  children,
}: {
  initial?: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initial ?? DEFAULT_LOCALE);

  // On mount, reconcile with a stored/browser preference when no SSR value was given.
  useEffect(() => {
    if (initial) return;
    let next: Locale | null = null;
    try {
      const stored = localStorage.getItem(COOKIE) as Locale | null;
      if (stored === "es" || stored === "en") next = stored;
    } catch {
      /* ignore */
    }
    if (!next && typeof navigator !== "undefined") {
      next = navigator.language?.toLowerCase().startsWith("en") ? "en" : "es";
    }
    if (next && next !== locale) setLocaleState(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
