"use client";

import { createContext, useContext } from "react";
import type { Locale } from "@/lib/i18n";

type LocaleContextValue = {
  locale: Locale;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * El idioma de la página, resuelto en el servidor a partir de la URL
 * (`/en/*` = inglés) y bajado tal cual al cliente.
 *
 * Desde el bloque 6.2 no hay setter ni cookie: cambiar de idioma es navegar a la
 * ruta equivalente, así que el idioma que se ve y el que dice la URL nunca se
 * pueden contradecir. El selector del header son dos enlaces (`Header.tsx`).
 */
export function LocaleProvider({
  initial,
  children,
}: {
  initial: Locale;
  children: React.ReactNode;
}) {
  return (
    <LocaleContext.Provider value={{ locale: initial }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
