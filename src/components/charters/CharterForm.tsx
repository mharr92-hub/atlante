"use client";

import Link from "@/components/site/LocaleLink";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OCCASIONS, type Vessel } from "@/content/vessels";
import { useLocale } from "@/lib/locale-context";
import { localeHref } from "@/lib/locale-routing";
import { occasionLabel, routeLabel, t, tf } from "@/lib/i18n";
import { money } from "@/lib/format";
import { whatsappUrl } from "@/config/site";
import { track } from "@/lib/analytics";
import { durationsOf, rowForGroup } from "@/lib/vessel-pricing";
import {
  HANDOFF_KEY,
  vesselDestinationFallback,
  type HandoffPayload,
} from "@/lib/handoff-storage";
import PexDisclosure from "@/components/site/PexDisclosure";

/** Si `POST /api/leads` tarda más que esto, se sigue sin lead. */
const API_TIMEOUT_MS = 4000;

/** Mañana en formato ISO: el mínimo del selector de fecha. */
function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Formulario corto de charter (bloque 4.2).
 *
 * `closeMode = "deeplink"` (naves de PEX): crea el lead `charter_pex` y salta a
 * la pantalla `/listo`, que redirige al checkout de PEX con `ref=ATLANTE`.
 * `closeMode = "quote"` (naves aliadas): crea el lead `charter_partner` en
 * `quote_requested` y abre el WhatsApp de Atlante con el resumen — sin nombre,
 * correo ni teléfono en la URL (regla 7).
 */
export default function CharterForm({ vessel }: { vessel: Vessel }) {
  const { locale } = useLocale();
  const router = useRouter();

  const durations = durationsOf(vessel);
  const quote = vessel.closeMode === "quote";

  const [date, setDate] = useState(tomorrowISO());
  const [hours, setHours] = useState<number | "">(durations[0] ?? "");
  const [people, setPeople] = useState(Math.min(15, vessel.capacityMax));
  const [occasion, setOccasion] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [accepted, setAccepted] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sentLeadId, setSentLeadId] = useState<string | null | undefined>(undefined);

  const tier = rowForGroup(vessel, { people, hours: hours || null });

  /** Resumen para WhatsApp: sólo datos de la reserva, nunca personales. */
  function quoteMessage(leadId: string | null): string {
    const bits =
      locale === "es"
        ? [
            `Hola Atlante, pedí una cotización del ${vessel.name}`,
            `fecha ${date}`,
            hours ? `${hours} h` : null,
            `${people} personas`,
            occasion ? occasionLabel(occasion, locale) : null,
            leadId ? `referencia ${leadId}` : null,
          ]
        : [
            `Hi Atlante, I requested a quote for the ${vessel.name}`,
            `date ${date}`,
            hours ? `${hours} h` : null,
            `${people} people`,
            occasion ? occasionLabel(occasion, locale) : null,
            leadId ? `reference ${leadId}` : null,
          ];
    return `${bits.filter(Boolean).join(" · ")}.`;
  }

  function goToListo(destinationUrl: string, leadId: string | null) {
    const payload: HandoffPayload = {
      slug: vessel.slug,
      date,
      slot: "",
      pax: { personas: people },
      people,
      addons: [],
      total: tier?.price ?? 0,
      hours: hours || undefined,
      occasion: occasion || undefined,
      route: tier?.route,
      destinationUrl,
      leadId,
      mode: "charter",
    };
    try {
      sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(payload));
    } catch {
      /* sessionStorage bloqueado: /listo reconstruye la URL desde la nave */
    }

    track("lead_created", {
      lead_id: leadId ?? "",
      slug: vessel.slug,
      pax: people,
      value: tier?.price ?? 0,
    });

    router.push(
      localeHref(`/charters/${vessel.slug}/listo${leadId ? `?lead=${leadId}` : ""}`, locale),
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (name.trim().split(/\s+/).filter(Boolean).length < 2) return setError(t("err_name", locale));
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email.trim())) return setError(t("err_email", locale));
    if (phone.replace(/\D+/g, "").length < 7) return setError(t("err_phone", locale));
    if (people < 1 || people > vessel.capacityMax) return setError(t("err_people", locale));
    if (!accepted) return setError(t("err_accept", locale));

    setSending(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          vessel: vessel.slug,
          date,
          hours: hours || undefined,
          people,
          occasion: occasion || undefined,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          accepted: true,
        }),
      });
      clearTimeout(timer);

      if (response.status === 400) {
        const data = (await response.json()) as { field?: string };
        setSending(false);
        setError(
          data.field === "email"
            ? t("err_email", locale)
            : data.field === "phone"
              ? t("err_phone", locale)
              : data.field === "name"
                ? t("err_name", locale)
                : data.field === "date"
                  ? t("err_date", locale)
                  : data.field === "hours"
                    ? t("err_hours", locale)
                    : data.field === "vessel"
                      ? t("err_vessel", locale)
                      : t("err_people", locale),
        );
        return;
      }

      if (!response.ok) throw new Error(`status ${response.status}`);

      const data = (await response.json()) as {
        leadId: string | null;
        destinationUrl: string | null;
      };

      if (quote) {
        track("quote_requested", { vessel: vessel.slug, pax: people, hours: hours || 0 });
        setSending(false);
        setSentLeadId(data.leadId);
        return;
      }

      goToListo(data.destinationUrl ?? vesselDestinationFallback(vessel), data.leadId);
    } catch (cause) {
      clearTimeout(timer);
      console.error("[charter] no se pudo crear el lead; se continúa sin ref_id", cause);
      if (quote) {
        // Sin lead guardado el cierre sigue siendo WhatsApp: no se pierde nadie.
        track("quote_requested", { vessel: vessel.slug, pax: people, hours: hours || 0 });
        setSending(false);
        setSentLeadId(null);
        return;
      }
      goToListo(vesselDestinationFallback(vessel), null);
    }
  }

  if (quote && sentLeadId !== undefined) {
    return (
      <div className="funnel-card charter-form">
        <h3>{t("quote_sent_title", locale)}</h3>
        <p>{t("quote_sent_body", locale)}</p>
        <a
          className="button button-primary"
          href={whatsappUrl(quoteMessage(sentLeadId))}
          target="_blank"
          rel="noreferrer"
          onClick={() => track("whatsapp_click", { context: `quote:${vessel.slug}` })}
        >
          {t("quote_open_whatsapp", locale)}
        </a>
        <p className="funnel-note">{t("quote_reply", locale)}</p>
      </div>
    );
  }

  return (
    <form className="funnel-card charter-form" onSubmit={submit}>
      <h3>{quote ? t("quote_cta", locale) : t("charter_form_title", locale)}</h3>
      <p className="funnel-note">
        {quote ? t("quote_lede", locale) : t("charter_form_lede", locale)}
      </p>

      {error ? (
        <p className="funnel-error" role="alert">
          {error}
        </p>
      ) : null}

      <label className="field">
        <span>{t("field_charter_date", locale)}</span>
        <input
          type="date"
          name="date"
          required
          min={tomorrowISO()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>

      {durations.length > 0 ? (
        <label className="field">
          <span>{t("field_hours", locale)}</span>
          <select
            name="hours"
            value={hours}
            onChange={(e) => setHours(e.target.value ? Number(e.target.value) : "")}
          >
            {durations.map((h) => (
              <option key={h} value={h}>
                {tf("hours_n", locale, { n: h })}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="field">
        <span>{t("field_people", locale)}</span>
        <input
          type="number"
          name="people"
          inputMode="numeric"
          required
          min={1}
          max={vessel.capacityMax}
          value={people}
          onChange={(e) => setPeople(Number(e.target.value))}
        />
      </label>

      <label className="field">
        <span>{t("field_occasion", locale)}</span>
        <select name="occasion" value={occasion} onChange={(e) => setOccasion(e.target.value)}>
          <option value="">—</option>
          {OCCASIONS.map((key) => (
            <option key={key} value={key}>
              {occasionLabel(key, locale)}
            </option>
          ))}
        </select>
      </label>

      {tier ? (
        <>
          <div className="summary-line total">
            <span>
              {t("estimate_boat", locale)} · {routeLabel(tier.route, locale)} ·{" "}
              {tf("hours_n", locale, { n: tier.hours })}
            </span>
            <span>{money(tier.price)}</span>
          </div>
          <p className="funnel-note">{t("estimate_note", locale)}</p>
        </>
      ) : (
        <p className="funnel-note">{tf("no_price_for_group", locale, { n: people })}</p>
      )}

      <label className="field">
        <span>{t("field_name", locale)}</span>
        <input
          type="text"
          name="name"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <label className="field">
        <span>{t("field_whatsapp", locale)}</span>
        <span className="field-phone">
          <span className="prefix">+507</span>
          <input
            type="tel"
            name="phone"
            inputMode="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </span>
      </label>

      <label className="field">
        <span>{t("field_email", locale)}</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <label className="consent">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
        />
        <span>
          {t("accept_before", locale)}
          <Link href="/terminos">{t("legal_terms", locale)}</Link>
          {t("accept_and", locale)}
          <Link href="/privacidad">{t("legal_privacy", locale)}</Link>.
        </span>
      </label>

      <button type="submit" className="button button-primary" disabled={sending}>
        {sending
          ? t("sending", locale)
          : quote
            ? t("quote_cta", locale)
            : t("continue_to_pex", locale)}
      </button>

      {quote ? (
        <p className="funnel-note">{t("quote_reply", locale)}</p>
      ) : (
        <PexDisclosure variant="inline" tone="light" />
      )}
    </form>
  );
}
