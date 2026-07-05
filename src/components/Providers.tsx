"use client";

import { LocaleProvider } from "@/lib/locale-context";
import { CurrencyProvider } from "@/lib/currency-context";
import type { Locale } from "@/lib/i18n";

export default function Providers({
  initialLocale,
  children,
}: {
  initialLocale?: Locale;
  children: React.ReactNode;
}) {
  return (
    <LocaleProvider initial={initialLocale}>
      <CurrencyProvider>{children}</CurrencyProvider>
    </LocaleProvider>
  );
}
