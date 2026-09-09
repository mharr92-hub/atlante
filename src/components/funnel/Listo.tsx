"use client";

import type { Product } from "@/content/catalog";
import { useLocale } from "@/lib/locale-context";
import { L, formatDate, t } from "@/lib/i18n";
import { money } from "@/lib/format";
import { priceRows, slotLabel } from "@/lib/funnel";
import { destinationFallback, type HandoffPayload } from "@/lib/handoff-storage";
import ListoScreen, { type SummaryLine } from "@/components/funnel/ListoScreen";

/**
 * Pantalla de salto de la ticketería: arma el resumen del funnel y delega la
 * cuenta regresiva, el código copiable y el salto en `ListoScreen`, que comparte
 * con los charters (bloque 4.2).
 */
export default function Listo({ product, leadId }: { product: Product; leadId: string | null }) {
  const { locale } = useLocale();
  const rows = priceRows(product);

  function summary(payload: HandoffPayload | null): SummaryLine[] {
    if (!payload) return [];
    const lines: SummaryLine[] = [];

    if (payload.date) {
      lines.push({
        key: "date",
        label: product.kind === "ferry" ? t("estimated_date", locale) : t("label_date", locale),
        value: formatDate(payload.date, locale),
      });
    }

    if (payload.timeLabel || payload.slot) {
      lines.push({
        key: "time",
        label: t("label_time", locale),
        value:
          payload.timeLabel ??
          slotLabel(
            (product.schedule?.times ?? []).find((s) => s.start === payload.slot) ?? {
              start: payload.slot,
            },
          ),
      });
    }

    for (const row of rows) {
      const qty = payload.pax?.[row.key] ?? 0;
      if (qty <= 0) continue;
      lines.push({
        key: row.key,
        label: `${L(row.label, locale)} × ${qty}`,
        value: money(row.price * qty),
      });
    }

    lines.push({
      key: "total",
      label: t("estimated_total", locale),
      value: money(payload.total),
      total: true,
    });

    return lines;
  }

  return (
    <ListoScreen
      name={L(product.name, locale)}
      fallbackUrl={destinationFallback(product)}
      leadId={leadId}
      target={product.slug}
      backHref={`/tours/${product.slug}`}
      backLabel={t("back_catalog", locale)}
      summary={summary}
    />
  );
}
