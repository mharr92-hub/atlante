/**
 * Money, currency and pricing helpers.
 *
 * USD is the base currency (Panama uses the US dollar). Additional currencies
 * are converted with static reference rates; swap `RATES` for a live FX feed
 * (e.g. a cached call to exchangerate.host) when you want real-time conversion.
 */
import type { Tour } from "@/content/tours";

export type CurrencyCode = "USD" | "EUR" | "COP" | "MXN";

export const CURRENCIES: Record<
  CurrencyCode,
  { label: string; locale: string; rate: number }
> = {
  USD: { label: "USD $", locale: "en-US", rate: 1 },
  EUR: { label: "EUR €", locale: "de-DE", rate: 0.92 },
  COP: { label: "COP $", locale: "es-CO", rate: 4050 },
  MXN: { label: "MXN $", locale: "es-MX", rate: 17.1 },
};

/** Format a USD amount in the target currency. */
export function money(
  usd: number,
  currency: CurrencyCode = "USD",
  opts: { maximumFractionDigits?: number } = {},
): string {
  const { rate, locale } = CURRENCIES[currency];
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: opts.maximumFractionDigits ?? 0,
  }).format(usd * rate);
}

/**
 * Compute the price for a tour given a guest count.
 * - perPerson: priceFrom * guests
 * - perBoat: priceFrom + max(0, guests - baseCapacity) * extraGuestPrice
 * Mirrors the prod app's charter pricing (base + extra-pax surcharge).
 */
export function priceForGuests(tour: Tour, guests: number): number {
  const p = tour.pricing;
  const g = Math.max(1, Math.min(guests, p.maxCapacity));
  if (p.model === "perPerson") return p.priceFrom * g;
  const extra = Math.max(0, g - p.baseCapacity) * (p.extraGuestPrice ?? 0);
  return p.priceFrom + extra;
}

/** Deposit due now to lock the date. */
export function depositAmount(total: number, percent: number): number {
  return Math.round((total * percent) / 100);
}
