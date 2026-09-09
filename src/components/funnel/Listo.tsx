"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "@/content/catalog";
import { useLocale } from "@/lib/locale-context";
import { L, formatDate, t, tf } from "@/lib/i18n";
import { money } from "@/lib/format";
import { priceRows, slotLabel } from "@/lib/funnel";
import { ATLANTE_REF, PEX_BRAND } from "@/lib/pex";
import { destinationFallback, HANDOFF_KEY, type HandoffPayload } from "@/lib/handoff-storage";
import { useClientString } from "@/lib/client-store";
import { track } from "@/lib/analytics";

const COUNTDOWN_SECONDS = 3;

/**
 * "Te llevamos a Pacific Experience".
 *
 * Modo puente: PEX todavía no lee `ref` por URL, así que aquí se muestra el
 * código ATLANTE y se copia al portapapeles antes del salto — es lo único que
 * garantiza la atribución si el checkout lo pide.
 */
export default function Listo({ product, leadId }: { product: Product; leadId: string | null }) {
  const { locale } = useLocale();
  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);
  const [copied, setCopied] = useState(false);
  const jumped = useRef(false);

  // El destino llega por sessionStorage; si no está (recarga, pestaña nueva),
  // se reconstruye desde el catálogo con `ref=ATLANTE` y sin `ref_id`.
  const raw = useClientString(() => sessionStorage.getItem(HANDOFF_KEY));
  const payload = useMemo<HandoffPayload | null>(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as HandoffPayload;
    } catch {
      return null;
    }
  }, [raw]);

  const destinationUrl = payload?.destinationUrl ?? destinationFallback(product);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  useEffect(() => {
    if (seconds > 0 || jumped.current) return;
    jump();
    // `jump` es estable dentro del ciclo de vida de la pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds]);

  function jump() {
    if (jumped.current) return;
    jumped.current = true;

    track("redirect_to_pex", {
      lead_id: leadId ?? "",
      target: product.slug,
      mode: "puente",
    });

    // Best-effort: el navegador ya se está yendo, por eso `keepalive`.
    if (leadId) {
      try {
        void fetch(`/api/leads/${leadId}/redirected`, { method: "POST", keepalive: true });
      } catch {
        /* si no sale, el admin lo ve igual como `created` */
      }
    }

    window.location.assign(destinationUrl);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(ATLANTE_REF);
      setCopied(true);
    } catch {
      // Fallback para navegadores sin permiso de portapapeles.
      const input = document.createElement("input");
      input.value = ATLANTE_REF;
      document.body.appendChild(input);
      input.select();
      try {
        document.execCommand("copy");
        setCopied(true);
      } catch {
        setCopied(false);
      }
      document.body.removeChild(input);
    }
  }

  const rows = priceRows(product);

  return (
    <section className="listo">
      <div className="listo-card">
        <h1>{t("listo_title", locale)}</h1>
        <p>{L(product.name, locale)}</p>

        {payload?.date ? (
          <div className="summary-line">
            <span>{product.kind === "ferry" ? t("estimated_date", locale) : t("label_date", locale)}</span>
            <span>{formatDate(payload.date, locale)}</span>
          </div>
        ) : null}
        {payload?.slot ? (
          <div className="summary-line">
            <span>{t("label_time", locale)}</span>
            <span>
              {slotLabel(
                (product.schedule?.times ?? []).find((s) => s.start === payload.slot) ?? {
                  start: payload.slot,
                },
              )}
            </span>
          </div>
        ) : null}
        {payload
          ? rows
              .filter((row) => (payload.pax?.[row.key] ?? 0) > 0)
              .map((row) => (
                <div className="summary-line" key={row.key}>
                  <span>
                    {L(row.label, locale)} × {payload.pax[row.key]}
                  </span>
                  <span>{money(row.price * payload.pax[row.key])}</span>
                </div>
              ))
          : null}
        {payload ? (
          <div className="summary-line total">
            <span>{t("estimated_total", locale)}</span>
            <span>{money(payload.total)}</span>
          </div>
        ) : null}

        <div className="listo-code">
          <div>
            <p style={{ margin: 0 }}>{t("listo_code_line", locale)}</p>
            <strong>{ATLANTE_REF}</strong>
          </div>
          <button type="button" className="listo-copy" onClick={copyCode}>
            {copied ? t("listo_copied", locale) : t("listo_copy", locale)}
          </button>
        </div>

        <p className="funnel-note">{tf("listo_countdown", locale, { n: Math.max(seconds, 0) })}</p>

        <button type="button" className="button button-primary" onClick={jump}>
          {t("listo_go_now", locale)} — {PEX_BRAND}
        </button>

        <p className="funnel-note" style={{ marginTop: 16 }}>
          <Link href={`/tours/${product.slug}`}>{t("back_catalog", locale)}</Link>
        </p>
      </div>
    </section>
  );
}
