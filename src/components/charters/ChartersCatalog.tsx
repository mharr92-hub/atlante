"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import type { Vessel } from "@/content/vessels";
import { useLocale } from "@/lib/locale-context";
import { routeLabel, t, tf, vesselTypeLabel } from "@/lib/i18n";
import { track } from "@/lib/analytics";
import {
  DEFAULT_PEOPLE,
  DURATIONS,
  MAX_COMPARE,
  facets,
  filterVessels,
  sortByPricePerPerson,
  type VesselFilters,
} from "@/lib/vessel-pricing";
import VesselCard from "@/components/charters/VesselCard";

function intParam(raw: string | null, min: number, max: number): number | null {
  const value = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(value) || value < min || value > max) return null;
  return value;
}

/**
 * `/charters`: listado unificado de naves con filtros, precio por persona
 * calculado y selección para el comparador. Todo el estado vive en la URL, para
 * que un filtro se pueda compartir y "atrás" funcione.
 */
export default function ChartersCatalog({
  vessels,
  verified = [],
}: {
  vessels: Vessel[];
  /** Slugs de naves cuyo operador muestra el sello (se calcula en el servidor). */
  verified?: string[];
}) {
  const { locale } = useLocale();
  const params = useSearchParams();

  useEffect(() => {
    track("view_catalog", { portal: "charters" });
  }, []);

  const people = intParam(params.get("people"), 1, 500) ?? DEFAULT_PEOPLE;
  const filters: VesselFilters = useMemo(
    () => ({
      people,
      minCapacity: intParam(params.get("cap"), 1, 500) ?? undefined,
      maxBudget: intParam(params.get("max"), 1, 1_000_000) ?? undefined,
      hours: intParam(params.get("hours"), 1, 24),
      route: params.get("route") || null,
      type: params.get("type") || null,
      marina: params.get("marina") || null,
    }),
    [params, people],
  );

  const compare = useMemo(
    () => (params.get("compare") ?? "").split(",").filter(Boolean).slice(0, MAX_COMPARE),
    [params],
  );

  const { types, marinas } = useMemo(() => facets(vessels), [vessels]);
  const shown = useMemo(
    () => sortByPricePerPerson(filterVessels(vessels, filters), { people }),
    [vessels, filters, people],
  );
  const sealed = useMemo(() => new Set(verified), [verified]);

  function write(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "") sp.delete(key);
      else sp.set(key, value);
    }
    const query = sp.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }

  function toggleCompare(slug: string) {
    const next = compare.includes(slug)
      ? compare.filter((s) => s !== slug)
      : [...compare, slug].slice(0, MAX_COMPARE);
    write({ compare: next.join(",") });
  }

  const compareHref = `/charters/comparar?v=${compare.join(",")}&people=${people}`;

  return (
    <section className="section section-ivory">
      <div className="section-inner">
        <div className="section-heading">
          <p className="eyebrow">{t("charters_eyebrow", locale)}</p>
          <h1>{t("charters_title", locale)}</h1>
          <p>{t("charters_marketplace_lede", locale)}</p>
        </div>

        <form className="charter-filters" onSubmit={(e) => e.preventDefault()}>
          <h2 className="filters-title">{t("filters_title", locale)}</h2>

          <label className="field">
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

          <label className="field">
            <span>{t("filter_min_capacity", locale)}</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={500}
              value={params.get("cap") ?? ""}
              onChange={(e) => write({ cap: e.target.value })}
            />
          </label>

          <label className="field">
            <span>{t("filter_max_budget", locale)}</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              step={50}
              value={params.get("max") ?? ""}
              onChange={(e) => write({ max: e.target.value })}
            />
          </label>

          <label className="field">
            <span>{t("filter_duration", locale)}</span>
            <select
              value={params.get("hours") ?? ""}
              onChange={(e) => write({ hours: e.target.value })}
            >
              <option value="">{t("filter_all", locale)}</option>
              {DURATIONS.map((hours) => (
                <option key={hours} value={hours}>
                  {tf("hours_n", locale, { n: hours })}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{t("filter_route", locale)}</span>
            <select
              value={params.get("route") ?? ""}
              onChange={(e) => write({ route: e.target.value })}
            >
              <option value="">{t("filter_all", locale)}</option>
              {[...new Set(vessels.flatMap((v) => v.routes))].map((route) => (
                <option key={route} value={route}>
                  {routeLabel(route, locale)}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{t("filter_type", locale)}</span>
            <select
              value={params.get("type") ?? ""}
              onChange={(e) => write({ type: e.target.value })}
            >
              <option value="">{t("filter_all", locale)}</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {vesselTypeLabel(type, locale)}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{t("filter_marina", locale)}</span>
            <select
              value={params.get("marina") ?? ""}
              onChange={(e) => write({ marina: e.target.value })}
            >
              <option value="">{t("filter_all", locale)}</option>
              {marinas.map((marina) => (
                <option key={marina} value={marina}>
                  {marina}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="button button-ghost"
            onClick={() =>
              write({ cap: null, max: null, hours: null, route: null, type: null, marina: null })
            }
          >
            {t("filter_clear", locale)}
          </button>
        </form>

        <p className="fact charter-count">{tf("vessels_count", locale, { n: shown.length })}</p>

        {shown.length === 0 ? (
          <p className="admin-empty">{t("charters_empty", locale)}</p>
        ) : (
          <div className="charter-grid">
            {shown.map((vessel) => (
              <VesselCard
                key={vessel.slug}
                vessel={vessel}
                people={people}
                verified={sealed.has(vessel.slug)}
                compare={{
                  selected: compare.includes(vessel.slug),
                  disabled: compare.length >= MAX_COMPARE,
                  onToggle: () => toggleCompare(vessel.slug),
                }}
              />
            ))}
          </div>
        )}

        {compare.length > 0 ? (
          <div className="compare-bar">
            <span>{t("compare_max", locale)}</span>
            <Link className="button button-primary" href={compareHref}>
              {tf("compare_open", locale, { n: compare.length })}
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
