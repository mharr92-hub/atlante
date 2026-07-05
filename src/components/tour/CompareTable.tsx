"use client";

import Link from "next/link";
import { tours } from "@/content/tours";
import { useLocale } from "@/lib/locale-context";
import { useCurrency } from "@/lib/currency-context";
import { L, t } from "@/lib/i18n";
import { money } from "@/lib/format";

export default function CompareTable() {
  const { locale } = useLocale();
  const { currency } = useCurrency();

  const rows: Array<{ label: string; render: (i: number) => React.ReactNode }> = [
    {
      label: locale === "es" ? "Precio desde" : "Price from",
      render: (i) => (
        <>
          {money(tours[i].pricing.priceFrom, currency)}
          <div style={{ fontSize: 12, color: "rgba(10,36,33,.55)" }}>
            {tours[i].pricing.model === "perPerson" ? t("per_person", locale) : t("per_boat", locale)}
          </div>
        </>
      ),
    },
    { label: locale === "es" ? "Duracion" : "Duration", render: (i) => L(tours[i].duration, locale) },
    {
      label: locale === "es" ? "Capacidad" : "Capacity",
      render: (i) => `${tours[i].pricing.maxCapacity} ${locale === "es" ? "personas" : "people"}`,
    },
    {
      label: locale === "es" ? "Tipo" : "Type",
      render: (i) =>
        tours[i].kind === "charter"
          ? locale === "es"
            ? "Charter privado"
            : "Private charter"
          : "Tour",
    },
    {
      label: t("included", locale),
      render: (i) => (
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {tours[i].included.slice(0, 3).map((x, k) => (
            <li key={k}>{L(x, locale)}</li>
          ))}
        </ul>
      ),
    },
    {
      label: "",
      render: (i) => (
        <Link className="button button-primary" href={`/tours/${tours[i].slug}`}>
          {t("view_detail", locale)}
        </Link>
      ),
    },
  ];

  return (
    <div className="compare-wrap">
      <table className="compare-table">
        <thead>
          <tr>
            <th style={{ width: 160 }}></th>
            {tours.map((tr) => (
              <th key={tr.slug}>{L(tr.name, locale)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              <td style={{ fontWeight: 700 }}>{row.label}</td>
              {tours.map((_, i) => (
                <td key={i}>{row.render(i)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
