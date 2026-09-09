"use client";

import type { Vessel } from "@/content/vessels";
import { useLocale } from "@/lib/locale-context";
import { formatDate, occasionLabel, routeLabel, t, tf } from "@/lib/i18n";
import { money } from "@/lib/format";
import { vesselDestinationFallback, type HandoffPayload } from "@/lib/handoff-storage";
import ListoScreen, { type SummaryLine } from "@/components/funnel/ListoScreen";

/**
 * Pantalla de salto de un chárter de PEX: mismo `ListoScreen` de la ticketería
 * (código ATLANTE copiable, cuenta regresiva y salto), con el resumen de la nave.
 */
export default function CharterListo({
  vessel,
  leadId,
}: {
  vessel: Vessel;
  leadId: string | null;
}) {
  const { locale } = useLocale();

  function summary(payload: HandoffPayload | null): SummaryLine[] {
    if (!payload) return [];
    const lines: SummaryLine[] = [];

    if (payload.date) {
      lines.push({
        key: "date",
        label: t("field_charter_date", locale),
        value: formatDate(payload.date, locale),
      });
    }
    if (payload.hours) {
      lines.push({
        key: "hours",
        label: t("field_hours", locale),
        value: tf("hours_n", locale, { n: payload.hours }),
      });
    }
    if (payload.people) {
      lines.push({
        key: "people",
        label: t("field_people", locale),
        value: String(payload.people),
      });
    }
    if (payload.occasion) {
      lines.push({
        key: "occasion",
        label: t("field_occasion", locale),
        value: occasionLabel(payload.occasion, locale),
      });
    }
    if (payload.total > 0) {
      lines.push({
        key: "total",
        label: payload.route
          ? `${t("estimate_boat", locale)} · ${routeLabel(payload.route, locale)}`
          : t("estimate_boat", locale),
        value: money(payload.total),
        total: true,
      });
    }

    return lines;
  }

  return (
    <ListoScreen
      name={vessel.name}
      fallbackUrl={vesselDestinationFallback(vessel)}
      leadId={leadId}
      target={vessel.slug}
      backHref={`/charters/${vessel.slug}`}
      backLabel={t("back_charters", locale)}
      summary={summary}
    />
  );
}
