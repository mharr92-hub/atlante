"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/lib/locale-context";
import { t, tf } from "@/lib/i18n";
import { ATLANTE_REF, PEX_BRAND } from "@/lib/pex";
import { HANDOFF_KEY, type HandoffPayload } from "@/lib/handoff-storage";
import { useClientString } from "@/lib/client-store";
import { track } from "@/lib/analytics";

const COUNTDOWN_SECONDS = 3;

export interface SummaryLine {
  key: string;
  label: string;
  value: string;
  total?: boolean;
}

/**
 * "Te llevamos a Pacific Experience" — la pantalla de salto, compartida por la
 * ticketería (bloque 2) y por los charters de PEX (bloque 4).
 *
 * Modo puente: PEX todavía no lee `ref` por URL, así que aquí se muestra el
 * código ATLANTE y se copia al portapapeles antes del salto — es lo único que
 * garantiza la atribución si el checkout lo pide.
 *
 * El destino viaja por `sessionStorage`, nunca por la URL (regla 7). Si no está
 * —recarga, pestaña nueva— se usa `fallbackUrl`, que lleva `ref=ATLANTE` sin
 * `ref_id`: el salto nunca se bloquea.
 */
export default function ListoScreen({
  name,
  fallbackUrl,
  leadId,
  target,
  backHref,
  backLabel,
  summary,
}: {
  name: string;
  fallbackUrl: string;
  leadId: string | null;
  /** Identificador del producto o la nave, para el evento `redirect_to_pex`. */
  target: string;
  backHref: string;
  backLabel: string;
  summary: (payload: HandoffPayload | null) => SummaryLine[];
}) {
  const { locale } = useLocale();
  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);
  const [copied, setCopied] = useState(false);
  const jumped = useRef(false);

  const raw = useClientString(() => sessionStorage.getItem(HANDOFF_KEY));
  const payload = useMemo<HandoffPayload | null>(() => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as HandoffPayload;
      // Un payload de otra reserva no puede secuestrar esta pantalla.
      return parsed.slug === target ? parsed : null;
    } catch {
      return null;
    }
  }, [raw, target]);

  const destinationUrl = payload?.destinationUrl ?? fallbackUrl;
  const lines = summary(payload);

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
      target,
      mode: payload?.mode ?? "puente",
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

  return (
    <section className="listo">
      <div className="listo-card">
        <h1>{t("listo_title", locale)}</h1>
        <p>{name}</p>

        {lines.map((line) => (
          <div className={`summary-line${line.total ? " total" : ""}`} key={line.key}>
            <span>{line.label}</span>
            <span>{line.value}</span>
          </div>
        ))}

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
          <Link href={backHref}>{backLabel}</Link>
        </p>
      </div>
    </section>
  );
}
