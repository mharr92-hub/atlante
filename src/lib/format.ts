/**
 * Money helpers.
 *
 * USD only: Panama uses the US dollar and the payment always happens on the
 * operator's checkout (Pacific Experience charges in USD). R0 removed the
 * USD/EUR/COP/MXN selector and its fixed reference rates — converting on the
 * client showed a price the customer would never actually be charged.
 */
import type { PriceUnit } from "@/content/catalog";
import { t, type DictKey, type Locale } from "@/lib/i18n";

/**
 * Format a USD amount. Whole dollars render without decimals; amounts with
 * cents keep the two decimals.
 */
export function money(usd: number): string {
  const hasCents = !Number.isInteger(usd);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(usd);
}

const UNIT_KEY: Record<PriceUnit, DictKey> = {
  per_person: "per_person",
  per_segment: "per_segment",
  per_boat: "per_boat",
};

/** "desde $25 por persona" / "from $25 per person". */
export function priceFromLabel(amount: number, unit: PriceUnit, locale: Locale): string {
  return `${t("from", locale)} ${money(amount)} ${t(UNIT_KEY[unit], locale)}`;
}
