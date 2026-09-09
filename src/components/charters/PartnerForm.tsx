"use client";

import Link from "@/components/site/LocaleLink";
import { useState } from "react";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { whatsappUrl } from "@/config/site";
import { track } from "@/lib/analytics";

const API_TIMEOUT_MS = 5000;

const KINDS = [
  { key: "operator", label: "partner_kind_operator" },
  { key: "hotel", label: "partner_kind_hotel" },
  { key: "agency", label: "partner_kind_agency" },
] as const;

/**
 * `/aliados/registro` (bloque 4.2): alta self-service.
 *
 * Si la base de datos no responde, no se pierde al aliado: se le ofrece cerrar
 * por WhatsApp y Mark lo registra a mano (regla 9).
 */
export default function PartnerForm() {
  const { locale } = useLocale();

  const [kind, setKind] = useState<string>("operator");
  const [name, setName] = useState("");
  const [vesselName, setVesselName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [zone, setZone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [photos, setPhotos] = useState("");
  const [message, setMessage] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<null | { saved: boolean }>(null);

  const isOperator = kind === "operator";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (name.trim().length < 2) return setError(t("err_partner_name", locale));
    if (whatsapp.replace(/\D+/g, "").length < 7) return setError(t("err_phone", locale));
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email.trim())) {
      return setError(t("err_email", locale));
    }

    setSending(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const response = await fetch("/api/partner-applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          kind,
          name: name.trim(),
          vesselName: vesselName.trim() || undefined,
          capacity: capacity || undefined,
          zone: zone.trim() || undefined,
          whatsapp: whatsapp.trim(),
          email: email.trim() || undefined,
          photos,
          message: message.trim() || undefined,
        }),
      });
      clearTimeout(timer);

      if (response.status === 400) {
        const data = (await response.json()) as { field?: string };
        setSending(false);
        setError(
          data.field === "whatsapp"
            ? t("err_phone", locale)
            : data.field === "email"
              ? t("err_email", locale)
              : data.field === "name"
                ? t("err_partner_name", locale)
                : t("err_generic", locale),
        );
        return;
      }

      if (!response.ok) throw new Error(`status ${response.status}`);

      const data = (await response.json()) as { saved?: boolean };
      setSending(false);
      setSent({ saved: Boolean(data.saved) });
    } catch (cause) {
      clearTimeout(timer);
      console.error("[aliados] no se pudo guardar la solicitud", cause);
      setSending(false);
      setSent({ saved: false });
    }
  }

  if (sent) {
    const waMessage =
      locale === "es"
        ? `Hola Atlante, quiero registrarme como aliado (${t(
            KINDS.find((k) => k.key === kind)?.label ?? "partner_kind_operator",
            "es",
          )}).`
        : `Hi Atlante, I'd like to register as a partner (${t(
            KINDS.find((k) => k.key === kind)?.label ?? "partner_kind_operator",
            "en",
          )}).`;

    return (
      <div className="funnel-card charter-form">
        <h2>{t("partner_form_title", locale)}</h2>
        <p>{sent.saved ? t("partner_sent", locale) : t("partner_sent_offline", locale)}</p>
        <a
          className="button button-primary"
          href={whatsappUrl(waMessage)}
          target="_blank"
          rel="noreferrer"
          onClick={() => track("whatsapp_click", { context: "partner_application" })}
        >
          {t("quote_open_whatsapp", locale)}
        </a>
        <p className="funnel-note" style={{ marginTop: 16 }}>
          <Link href="/aliados">← {t("partners_eyebrow", locale)}</Link>
        </p>
      </div>
    );
  }

  return (
    <form className="funnel-card charter-form" onSubmit={submit}>
      <h1>{t("partner_form_title", locale)}</h1>
      <p className="funnel-note">{t("partners_commission_note", locale)}</p>

      {error ? (
        <p className="funnel-error" role="alert">
          {error}
        </p>
      ) : null}

      <label className="field">
        <span>{t("partner_kind", locale)}</span>
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          {KINDS.map((option) => (
            <option key={option.key} value={option.key}>
              {t(option.label, locale)}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>{t("field_business", locale)}</span>
        <input
          type="text"
          required
          autoComplete="organization"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      {isOperator ? (
        <>
          <label className="field">
            <span>{t("field_vessel_name", locale)}</span>
            <input type="text" value={vesselName} onChange={(e) => setVesselName(e.target.value)} />
          </label>

          <label className="field">
            <span>{t("field_capacity", locale)}</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={1000}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </label>

          <label className="field">
            <span>{t("field_photos", locale)}</span>
            <textarea rows={3} value={photos} onChange={(e) => setPhotos(e.target.value)} />
          </label>
        </>
      ) : null}

      <label className="field">
        <span>{t("field_zone", locale)}</span>
        <input type="text" value={zone} onChange={(e) => setZone(e.target.value)} />
      </label>

      <label className="field">
        <span>{t("field_whatsapp", locale)}</span>
        <span className="field-phone">
          <span className="prefix">+507</span>
          <input
            type="tel"
            inputMode="tel"
            required
            autoComplete="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
          />
        </span>
      </label>

      <label className="field">
        <span>{t("field_email", locale)}</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <label className="field">
        <span>{t("field_message", locale)}</span>
        <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
      </label>

      <button type="submit" className="button button-primary" disabled={sending}>
        {sending ? t("sending", locale) : t("partner_submit", locale)}
      </button>
    </form>
  );
}
