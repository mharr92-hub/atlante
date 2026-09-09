/**
 * Money and pricing helpers.
 *
 * USD only: Panama uses the US dollar and the payment always happens on the
 * operator's checkout (Pacific Experience charges in USD). R0 removed the
 * USD/EUR/COP/MXN selector and its fixed reference rates — converting on the
 * client showed a price the customer would never actually be charged.
 */
import type { Tour } from "@/content/tours";

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

/**
 * Compute the price for a tour given a guest count.
 * - perPerson: priceFrom * guests
 * - perBoat: priceFrom + max(0, guests - baseCapacity) * extraGuestPrice
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
