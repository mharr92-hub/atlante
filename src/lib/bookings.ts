/**
 * Server-side booking logic. Pricing is recomputed from the catalog here so a
 * client can never set its own price (same principle as the prod app).
 * Capacity is adjusted transactionally on confirm/cancel.
 */
import "server-only";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { getTour } from "@/content/tours";
import { priceForGuests, depositAmount } from "@/lib/format";

export interface BookingRequestInput {
  tourSlug: string;
  date: string; // YYYY-MM-DD
  timeSlot?: string;
  guests: number;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
}

function token(bytes = 16): string {
  return randomBytes(bytes).toString("hex");
}

function boardingCode(): string {
  return `ATL-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function createBookingRequest(input: BookingRequestInput) {
  const tour = getTour(input.tourSlug);
  if (!tour) throw new Error("unknown_tour");

  const guests = Math.max(1, Math.min(input.guests, tour.pricing.maxCapacity));
  const total = priceForGuests(tour, guests);
  const deposit = depositAmount(total, tour.pricing.depositPercent);
  const date = new Date(`${input.date}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error("bad_date");

  return db.booking.create({
    data: {
      tourSlug: tour.slug,
      bookingFlow: tour.kind === "charter" ? "charter_request" : "whatsapp_request",
      bookingDate: date,
      timeSlot: input.timeSlot ?? null,
      guestCount: guests,
      totalPrice: total,
      depositAmount: deposit,
      confirmationToken: token(),
      customerName: input.name.trim(),
      customerEmail: input.email.trim(),
      customerPhone: input.phone?.trim() || null,
      dietaryNotes: input.notes?.trim() || null,
    },
  });
}

/** Confirm a booking; decrement matching slot capacity if one exists. */
export async function confirmBooking(id: string) {
  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id } });
    if (!booking) throw new Error("not_found");
    if (booking.status === "confirmed") return booking;

    let slotId = booking.slotId;
    if (!slotId) {
      const slot = await tx.availabilitySlot.findFirst({
        where: {
          tourSlug: booking.tourSlug,
          date: booking.bookingDate,
          timeSlot: booking.timeSlot ?? undefined,
          archivedAt: null,
        },
      });
      if (slot) {
        if (slot.capacityRemaining < booking.guestCount) {
          throw new Error("insufficient_capacity");
        }
        await tx.availabilitySlot.update({
          where: { id: slot.id },
          data: { capacityRemaining: { decrement: booking.guestCount } },
        });
        slotId = slot.id;
      }
    }

    return tx.booking.update({
      where: { id },
      data: {
        status: "confirmed",
        slotId,
        boardingCode: booking.boardingCode ?? boardingCode(),
      },
    });
  });
}

/** Record a manual payment (cash / transfer) and mark the booking paid. */
export async function markPaid(id: string, method: "cash" | "transfer" | "manual", collectedBy?: string) {
  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id } });
    if (!booking) throw new Error("not_found");
    if (booking.paymentStatus === "paid") return booking;

    await tx.payment.create({
      data: {
        bookingId: id,
        amount: booking.totalPrice,
        method,
        collectedBy: collectedBy ?? null,
        providerRef: `${method}_${Date.now()}`,
      },
    });

    return tx.booking.update({
      where: { id },
      data: { paymentStatus: "paid", depositPaid: true, balancePaid: true },
    });
  });
}

/** Cancel a booking; release capacity if it had been reserved. */
export async function cancelBooking(id: string, reason?: string) {
  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id } });
    if (!booking) throw new Error("not_found");
    if (booking.status === "cancelled") return booking;

    if (booking.slotId) {
      await tx.availabilitySlot.update({
        where: { id: booking.slotId },
        data: { capacityRemaining: { increment: booking.guestCount } },
      });
    }

    return tx.booking.update({
      where: { id },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
        cancellationReason: reason ?? null,
        slotId: null,
      },
    });
  });
}
