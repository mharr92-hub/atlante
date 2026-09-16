"use client";

import { DEPOSIT_DISCLAIMER_EN, DEPOSIT_DISCLAIMER_ES } from "@/data/charters";
import { useLocale } from "@/lib/locale-context";

export default function DepositDisclaimer({ className = "" }: { className?: string }) {
  const { locale } = useLocale();
  return (
    <p className={`deposit-disclaimer ${className}`.trim()}>
      {locale === "en" ? DEPOSIT_DISCLAIMER_EN : DEPOSIT_DISCLAIMER_ES}
    </p>
  );
}
