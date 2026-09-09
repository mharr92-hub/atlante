"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "@/content/catalog";
import { useLocale } from "@/lib/locale-context";
import { L, formatDate, t, tf } from "@/lib/i18n";
import { money, priceFromLabel } from "@/lib/format";
import {
  activeAddons,
  computeTotal,
  decodePax,
  defaultPax,
  encodePax,
  firstSelectableDate,
  maxPax,
  minPax,
  paxTotal,
  priceRows,
  slotLabel,
  toISODate,
  usesTimeSlots,
  type Pax,
} from "@/lib/funnel";
import { destinationFallback, HANDOFF_KEY, type HandoffPayload } from "@/lib/handoff-storage";
import { readCookie, useClientString } from "@/lib/client-store";
import { PARTNER_COOKIE } from "@/lib/attribution-cookies";
import { track } from "@/lib/analytics";
import Calendar from "@/components/funnel/Calendar";
import PexDisclosure from "@/components/site/PexDisclosure";

/** Si `POST /api/leads` tarda más que esto, se sigue sin lead. */
const API_TIMEOUT_MS = 4000;

export default function Funnel({ product }: { product: Product }) {
  const { locale } = useLocale();
  const router = useRouter();
  const params = useSearchParams();

  const rows = priceRows(product);
  const addons = activeAddons(product);
  const withSlots = usesTimeSlots(product);

  const step = Math.min(3, Math.max(1, Number(params.get("step") ?? 1) || 1));

  // Los valores por defecto se calculan en el render, no en un efecto: así el
  // paso 2 ya abre con la primera fecha con salida elegida aunque la
  // sincronización con la URL (más abajo) no llegue a correr.
  const times = product.schedule?.times ?? [];
  const date = params.get("date") || toISODate(firstSelectableDate(product));
  const slot = params.get("slot") || (withSlots ? (times[0]?.start ?? "") : "");

  const pax = useMemo<Pax>(() => {
    const parsed = decodePax(params.get("pax"), product);
    return Object.keys(parsed).length > 0 ? parsed : defaultPax(product);
  }, [params, product]);

  const selectedAddons = useMemo(
    () => (params.get("addons") ?? "").split(",").filter(Boolean),
    [params],
  );

  const total = computeTotal(product, pax, selectedAddons);
  const people = paxTotal(pax);

  // --- datos personales: viven en el componente, nunca en la URL (regla 7) ---
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [accepted, setAccepted] = useState(false);

  // Código de aliado: `?partner=` manda, si no la cookie que dejó el proxy.
  // `partnerEdited` sólo existe cuando la persona lo escribe a mano.
  const [partnerEdited, setPartnerEdited] = useState<string | null>(null);
  const partnerCookie = useClientString(() => readCookie(PARTNER_COOKIE));
  const partnerCode =
    partnerEdited ?? (params.get("partner") ?? partnerCookie ?? "").slice(0, 40);

  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const sent = useRef(false);

  useEffect(() => {
    track("funnel_step", { slug: product.slug, step });
  }, [product.slug, step]);

  // Refleja en la URL lo que ya está elegido por defecto, para que "atrás" y
  // el enlace compartido reabran el funnel en el mismo estado.
  useEffect(() => {
    if (step !== 2) return;
    const sp = new URLSearchParams(params.toString());
    if (sp.get("date") === date && sp.get("slot") === (slot || null)) return;
    sp.set("date", date);
    if (slot) sp.set("slot", slot);
    window.history.replaceState(null, "", `?${sp.toString()}`);
  }, [step, date, slot, params]);

  function write(next: Record<string, string | null>, push: boolean) {
    const sp = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "") sp.delete(key);
      else sp.set(key, value);
    }
    const url = `?${sp.toString()}`;
    // Sólo el cambio de paso entra en el historial: así "atrás" recorre el
    // funnel y no cada toque del contador de pasajeros.
    if (push) window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }

  function goToStep(next: number) {
    write({ step: String(next) }, true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setPax(key: string, value: number) {
    const next = { ...pax, [key]: value };
    if (value <= 0) delete next[key];
    write({ pax: encodePax(next) }, false);
  }

  function toggleAddon(slugToToggle: string) {
    const next = selectedAddons.includes(slugToToggle)
      ? selectedAddons.filter((s) => s !== slugToToggle)
      : [...selectedAddons, slugToToggle];
    write({ addons: next.join(",") }, false);
  }

  // ------------------------------------------------------------- envío ----

  function handoff(destinationUrl: string, leadId: string | null) {
    if (sent.current) return;
    sent.current = true;

    const payload: HandoffPayload = {
      slug: product.slug,
      date,
      slot,
      pax,
      addons: selectedAddons,
      total,
      destinationUrl,
      leadId,
    };
    try {
      sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(payload));
    } catch {
      /* sessionStorage bloqueado: /listo reconstruye la URL desde el catálogo */
    }

    track("lead_created", {
      lead_id: leadId ?? "",
      slug: product.slug,
      pax: people,
      value: total,
    });

    router.push(`/reservar/${product.slug}/listo${leadId ? `?lead=${leadId}` : ""}`);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (name.trim().split(/\s+/).filter(Boolean).length < 2) return setError(t("err_name", locale));
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email.trim())) return setError(t("err_email", locale));
    if (phone.replace(/\D+/g, "").length < 7) return setError(t("err_phone", locale));
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
          slug: product.slug,
          date: date || undefined,
          timeSlot: slot || undefined,
          pax,
          addons: selectedAddons,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          partnerCode: partnerCode.trim() || undefined,
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
                  : t("err_pax", locale),
        );
        return;
      }

      if (!response.ok) throw new Error(`status ${response.status}`);

      const data = (await response.json()) as { leadId: string | null; destinationUrl: string };
      handoff(data.destinationUrl, data.leadId);
    } catch (cause) {
      clearTimeout(timer);
      // El handoff nunca se bloquea: se va a PEX con ref=ATLANTE, sin ref_id.
      console.error("[funnel] no se pudo crear el lead; se continúa sin ref_id", cause);
      handoff(destinationFallback(product, selectedAddons), null);
    }
  }

  // -------------------------------------------------------------- vista ----

  const stepLabels = [t("step1_name", locale), t("step2_name", locale), t("step3_name", locale)];

  return (
    <section className="funnel">
      <div className="funnel-inner">
        <div className="funnel-steps" role="presentation">
          {[1, 2, 3].map((n) => (
            <span key={n} className={n <= step ? "is-done" : ""} />
          ))}
        </div>
        <p className="funnel-step-label">
          {tf("step_of", locale, { n: step })} · {stepLabels[step - 1]}
        </p>

        {step === 1 ? (
          <div className="funnel-card">
            <h2>{L(product.name, locale)}</h2>
            <p>{L(product.summary, locale)}</p>
            <p>
              <strong>{priceFromLabel(product.priceFrom, product.priceUnit, locale)}</strong>
              {" · "}
              {L(product.durationLabel, locale)}
            </p>
            <PexDisclosure variant="inline" tone="light" />
            <div className="funnel-actions" style={{ marginTop: 18 }}>
              <button
                type="button"
                className="button button-primary"
                onClick={() => goToStep(2)}
              >
                {t("choose_date_cta", locale)}
              </button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <>
            <div className="funnel-card">
              <h2>{product.kind === "ferry" ? t("estimated_date", locale) : t("choose_date", locale)}</h2>
              <Calendar
                product={product}
                value={date}
                locale={locale}
                onChange={(iso) => write({ date: iso }, false)}
              />
              {product.kind === "ferry" ? (
                <p className="funnel-note">{t("open_ticket_note", locale)}</p>
              ) : null}
            </div>

            {withSlots ? (
              <div className="funnel-card">
                <h3>{t("choose_time", locale)}</h3>
                <div className="slot-list">
                  {(product.schedule?.times ?? []).map((time) => {
                    const label = slotLabel(time);
                    const selected = slot === time.start || (!slot && (product.schedule?.times.length ?? 0) === 1);
                    return (
                      <button
                        key={time.start}
                        type="button"
                        className={`slot-option${selected ? " is-selected" : ""}`}
                        aria-pressed={selected}
                        onClick={() => write({ slot: time.start }, false)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="funnel-card">
              <h3>{t("passengers", locale)}</h3>
              {rows.map((row) => {
                const value = pax[row.key] ?? 0;
                const others = people - value;
                return (
                  <div className="pax-row" key={row.key}>
                    <div className="pax-label">
                      {L(row.label, locale)}
                      <small>{money(row.price)}</small>
                    </div>
                    <div className="pax-stepper">
                      <button
                        type="button"
                        aria-label="-"
                        disabled={others + value - 1 < minPax(product) || value === 0}
                        onClick={() => setPax(row.key, value - 1)}
                      >
                        −
                      </button>
                      <span>{value}</span>
                      <button
                        type="button"
                        aria-label="+"
                        disabled={people >= maxPax(product)}
                        onClick={() => setPax(row.key, value + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
              {product.capacityMin ? (
                <p className="funnel-note">{tf("min_group", locale, { n: product.capacityMin })}</p>
              ) : null}
              <p className="funnel-note">{tf("max_group", locale, { n: maxPax(product) })}</p>
            </div>

            {addons.length > 0 ? (
              <div className="funnel-card">
                <h3>{t("addons_title", locale)}</h3>
                {addons.map((addon) => (
                  <label className="addon-row" key={addon.slug}>
                    <input
                      type="checkbox"
                      checked={selectedAddons.includes(addon.slug)}
                      onChange={() => toggleAddon(addon.slug)}
                    />
                    <span>
                      {L(addon.name, locale)} · {money(addon.price)}
                      {addon.unit === "pending" ? (
                        <small style={{ display: "block" }}>{t("addon_unit_pending", locale)}</small>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
            ) : null}

            <div className="funnel-card">
              <p className="funnel-note">{t("availability_note", locale)}</p>
              <div className="funnel-actions">
                <button type="button" className="funnel-back" onClick={() => goToStep(1)}>
                  {t("step_back", locale)}
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  disabled={!date || people < minPax(product)}
                  onClick={() => goToStep(3)}
                >
                  {t("continue_cta", locale)}
                </button>
              </div>
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <form onSubmit={submit}>
            <div className="funnel-card">
              <h3>{t("summary", locale)}</h3>
              <div className="summary-line">
                <span>{L(product.name, locale)}</span>
                <span>{L(product.durationLabel, locale)}</span>
              </div>
              {date ? (
                <div className="summary-line">
                  <span>{product.kind === "ferry" ? t("estimated_date", locale) : t("label_date", locale)}</span>
                  <span>{formatDate(date, locale)}</span>
                </div>
              ) : null}
              {withSlots && slot ? (
                <div className="summary-line">
                  <span>{t("label_time", locale)}</span>
                  <span>{slotLabel(times.find((s) => s.start === slot) ?? { start: slot })}</span>
                </div>
              ) : null}
              {rows
                .filter((row) => (pax[row.key] ?? 0) > 0)
                .map((row) => (
                  <div className="summary-line" key={row.key}>
                    <span>
                      {L(row.label, locale)} × {pax[row.key]}
                    </span>
                    <span>{money(row.price * (pax[row.key] ?? 0))}</span>
                  </div>
                ))}
              {addons
                .filter((addon) => selectedAddons.includes(addon.slug))
                .map((addon) => (
                  <div className="summary-line" key={addon.slug}>
                    <span>{L(addon.name, locale)}</span>
                    <span>{addon.unit === "pending" ? "—" : money(addon.price)}</span>
                  </div>
                ))}
              <div className="summary-line total">
                <span>{t("estimated_total", locale)}</span>
                <span>{money(total)}</span>
              </div>
              <p className="funnel-note">{t("charged_by_pex", locale)}</p>
            </div>

            <div className="funnel-card">
              <h3>{t("step3_name", locale)}</h3>
              {error ? (
                <p className="funnel-error" role="alert">
                  {error}
                </p>
              ) : null}

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

              <label className="field">
                <span>{t("field_partner", locale)}</span>
                <input
                  type="text"
                  name="partnerCode"
                  value={partnerCode}
                  onChange={(e) => setPartnerEdited(e.target.value)}
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

              <div className="funnel-actions">
                <button type="button" className="funnel-back" onClick={() => goToStep(2)}>
                  {t("step_back", locale)}
                </button>
                <button type="submit" className="button button-primary" disabled={sending}>
                  {sending ? t("sending", locale) : t("continue_to_pex", locale)}
                </button>
              </div>
            </div>
          </form>
        ) : null}
      </div>
    </section>
  );
}
