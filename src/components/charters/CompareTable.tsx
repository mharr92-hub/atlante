"use client";

import Link from "@/components/site/LocaleLink";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { Localized, Vessel } from "@/content/vessels";
import { useLocale } from "@/lib/locale-context";
import { L, t, tf, vesselTypeLabel } from "@/lib/i18n";
import { money } from "@/lib/format";
import {
  DEFAULT_PEOPLE,
  DURATIONS,
  MAX_COMPARE,
  matchingRows,
  pricePerPerson,
  rowForGroup,
} from "@/lib/vessel-pricing";

/** Une las listas bilingües de varias naves sin repetir, por su texto en español. */
function union(lists: Localized[][]): Localized[] {
  const seen = new Map<string, Localized>();
  for (const list of lists) {
    for (const item of list) {
      if (!seen.has(item.es)) seen.set(item.es, item);
    }
  }
  return [...seen.values()];
}

/**
 * `/charters/comparar?v=aura,pacific-ferry-1` (bloque 4.2): hasta cuatro naves
 * lado a lado — capacidad, precio por 4 / 8 / 12 h, precio por persona para el
 * grupo indicado, incluye / no incluye, apartado y política.
 */
export default function CompareTable({ vessels }: { vessels: Vessel[] }) {
  const { locale } = useLocale();
  const params = useSearchParams();

  const people = useMemo(() => {
    const value = Number.parseInt(params.get("people") ?? "", 10);
    return Number.isFinite(value) && value > 0 && value <= 500 ? value : DEFAULT_PEOPLE;
  }, [params]);

  const selected = useMemo(() => {
    const slugs = (params.get("v") ?? "").split(",").filter(Boolean).slice(0, MAX_COMPARE);
    return slugs
      .map((slug) => vessels.find((v) => v.slug === slug))
      .filter((v): v is Vessel => Boolean(v));
  }, [params, vessels]);

  function write(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) sp.set(key, value);
      else sp.delete(key);
    }
    window.history.replaceState(null, "", `?${sp.toString()}`);
  }

  if (selected.length === 0) {
    return (
      <section className="section section-ivory">
        <div className="section-inner">
          <div className="section-heading">
            <h1>{t("compare_title", locale)}</h1>
            <p>{t("compare_empty", locale)}</p>
          </div>
          <Link className="button button-primary" href="/charters">
            {t("view_all_charters", locale)}
          </Link>
        </div>
      </section>
    );
  }

  const includes = union(selected.map((v) => v.includes));
  const onRequest = union(selected.map((v) => v.onRequest.map((item) => item.label)));

  function priceCell(vessel: Vessel, hours: number): string {
    const row = rowForGroup(vessel, { hours, people });
    if (row) return money(row.price);
    return matchingRows(vessel, { hours }).length > 0 ? t("on_request", locale) : "—";
  }

  return (
    <section className="section section-ivory">
      <div className="section-inner">
        <div className="section-heading">
          <p className="eyebrow">{t("charters_eyebrow", locale)}</p>
          <h1>{t("compare_title", locale)}</h1>
          <p>{t("compare_max", locale)}</p>
        </div>

        <label className="field compare-people">
          <span>{t("filter_people", locale)}</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={500}
            value={people}
            onChange={(e) => write({ people: e.target.value })}
          />
        </label>

        <div className="admin-table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th scope="col">{/* etiquetas de fila */}</th>
                {selected.map((vessel) => (
                  <th key={vessel.slug} scope="col">
                    <Link href={`/charters/${vessel.slug}`}>{vessel.name}</Link>
                    <small>
                      {vessel.closeMode === "deeplink"
                        ? t("badge_direct", locale)
                        : t("badge_quote", locale)}
                    </small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">{t("filter_type", locale)}</th>
                {selected.map((v) => (
                  <td key={v.slug}>{vesselTypeLabel(v.type, locale)}</td>
                ))}
              </tr>
              <tr>
                <th scope="row">{t("capacity", locale)}</th>
                {selected.map((v) => (
                  <td key={v.slug}>{tf("up_to_pax", locale, { n: v.capacityMax })}</td>
                ))}
              </tr>
              <tr>
                <th scope="row">{t("marina_label", locale)}</th>
                {selected.map((v) => (
                  <td key={v.slug}>{v.marina}</td>
                ))}
              </tr>

              {DURATIONS.map((hours) => (
                <tr key={hours}>
                  <th scope="row">{tf("hours_n", locale, { n: hours })}</th>
                  {selected.map((v) => (
                    <td key={v.slug}>{priceCell(v, hours)}</td>
                  ))}
                </tr>
              ))}

              <tr className="compare-highlight">
                <th scope="row">
                  {t("per_person", locale)} · {tf("per_person_for_group", locale, { n: people })}
                </th>
                {selected.map((v) => {
                  const perPerson = pricePerPerson(v, { people });
                  return (
                    <td key={v.slug}>
                      {perPerson !== null ? money(perPerson) : t("on_request", locale)}
                    </td>
                  );
                })}
              </tr>

              <tr>
                <th scope="row">{t("deposit_label", locale)}</th>
                {selected.map((v) => (
                  <td key={v.slug}>{tf("deposit_value", locale, { n: v.depositPct })}</td>
                ))}
              </tr>
              <tr>
                <th scope="row">{t("cancellation_label", locale)}</th>
                {selected.map((v) => (
                  <td key={v.slug}>{L(v.cancellationPolicy, locale)}</td>
                ))}
              </tr>

              {includes.map((item) => (
                <tr key={`inc-${item.es}`}>
                  <th scope="row">
                    {t("included", locale)}: {L(item, locale)}
                  </th>
                  {selected.map((v) => (
                    <td key={v.slug}>{v.includes.some((i) => i.es === item.es) ? "✓" : "—"}</td>
                  ))}
                </tr>
              ))}

              {onRequest.map((item) => (
                <tr key={`req-${item.es}`}>
                  <th scope="row">
                    {t("on_request_title", locale)}: {L(item, locale)}
                  </th>
                  {selected.map((v) => (
                    <td key={v.slug}>
                      {v.onRequest.some((i) => i.label.es === item.es) ? "✓" : "—"}
                    </td>
                  ))}
                </tr>
              ))}

              <tr>
                <th scope="row">{/* CTA */}</th>
                {selected.map((v) => (
                  <td key={v.slug}>
                    <Link className="btn-sm btn-confirm" href={`/charters/${v.slug}`}>
                      {t("view_detail", locale)}
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <p className="fact" style={{ marginTop: 18 }}>
          <Link href="/charters">← {t("back_charters", locale)}</Link>
        </p>
      </div>
    </section>
  );
}
