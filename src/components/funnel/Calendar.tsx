"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/content/catalog";
import { MONTHS, WEEKDAYS_SHORT, type Locale } from "@/lib/i18n";
import { firstSelectableDate, fromISODate, isSelectableDate, toISODate } from "@/lib/funnel";

/**
 * Calendario mensual propio, sin librerías: sólo se habilitan los días de la
 * semana que PEX publica, nunca antes de mañana ni del `validFrom`. Abre en el
 * mes de la primera fecha con salida.
 */
export default function Calendar({
  product,
  value,
  onChange,
  locale,
}: {
  product: Product;
  value: string;
  onChange: (iso: string) => void;
  locale: Locale;
}) {
  const first = useMemo(() => firstSelectableDate(product), [product]);
  const selected = fromISODate(value) ?? first;
  const [cursor, setCursor] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));

  const firstMonth = new Date(first.getFullYear(), first.getMonth(), 1);
  const canGoBack = cursor > firstMonth;

  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const leading = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  function shift(months: number) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + months, 1));
  }

  return (
    <div>
      <div className="cal-head">
        <button
          type="button"
          className="cal-nav"
          onClick={() => shift(-1)}
          disabled={!canGoBack}
          aria-label={locale === "es" ? "Mes anterior" : "Previous month"}
        >
          ←
        </button>
        <strong>
          {MONTHS[locale][cursor.getMonth()]} {cursor.getFullYear()}
        </strong>
        <button
          type="button"
          className="cal-nav"
          onClick={() => shift(1)}
          aria-label={locale === "es" ? "Mes siguiente" : "Next month"}
        >
          →
        </button>
      </div>

      <div className="cal-grid">
        {WEEKDAYS_SHORT[locale].map((d) => (
          <div className="cal-dow" key={d}>
            {d}
          </div>
        ))}
        {Array.from({ length: leading }, (_, i) => (
          <div className="cal-empty" key={`empty-${i}`} />
        ))}
        {days.map((day) => {
          const date = new Date(cursor.getFullYear(), cursor.getMonth(), day);
          const iso = toISODate(date);
          const enabled = isSelectableDate(product, date);
          return (
            <button
              type="button"
              key={iso}
              className={`cal-day${iso === value ? " is-selected" : ""}`}
              disabled={!enabled}
              aria-pressed={iso === value}
              onClick={() => onChange(iso)}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
