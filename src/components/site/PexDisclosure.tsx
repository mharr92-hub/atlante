"use client";

import { useLocale } from "@/lib/locale-context";
import { L } from "@/lib/i18n";
import { buildPexUrl, PEX_BRAND, PEX_DOMAIN_LABEL } from "@/lib/pex";

/**
 * "Agente autorizado de Pacific Experience" — the single disclosure component
 * (PRD 5.10 / principle 7). It says who operates and who charges, everywhere a
 * visitor could confuse Atlante with the operator.
 *
 * The PEX link always goes through `buildPexUrl()` so the referral code and the
 * UTM set travel with it. No PEX logo until Mark authorises it (PENDIENTE MARK).
 */
const copy = {
  before: {
    es: "Atlante del Pacífico es agente autorizado de ",
    en: "Atlante del Pacífico is an authorized agent of ",
  },
  middle: {
    es: ". La reserva y el pago se completan en ",
    en: ". Booking and payment are completed on ",
  },
  after: { es: ".", en: "." },
} as const;

export default function PexDisclosure({
  variant = "inline",
  tone = "dark",
}: {
  /** `banner` = highlighted block; `inline` = one line inside other chrome. */
  variant?: "banner" | "inline";
  /** `light` when the surrounding surface is ivory. Only affects `inline`. */
  tone?: "dark" | "light";
}) {
  const { locale } = useLocale();

  const text = (
    <>
      {L(copy.before, locale)}
      <strong>{PEX_BRAND}</strong>
      {L(copy.middle, locale)}
      <a
        href={buildPexUrl({ target: "home", campaign: "disclosure" })}
        target="_blank"
        rel="noreferrer"
      >
        {PEX_DOMAIN_LABEL}
      </a>
      {L(copy.after, locale)}
    </>
  );

  if (variant === "banner") {
    return (
      <section className="pex-disclosure" aria-label={L(copy.before, locale).trim()}>
        <div className="section-inner">
          <p>{text}</p>
        </div>
      </section>
    );
  }

  return (
    <p className={tone === "light" ? "pex-inline pex-inline-light" : "pex-inline"}>{text}</p>
  );
}
