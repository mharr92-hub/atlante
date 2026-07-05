import { NextResponse } from "next/server";
import { createBookingRequest } from "@/lib/bookings";

/**
 * Public booking-request endpoint. Records a pending booking (pipeline) so the
 * admin dashboard sees it; the sale is still closed over WhatsApp. Price is
 * recomputed server-side from the catalog — the client cannot set it.
 *
 * Requires DATABASE_URL to be configured; returns 503 otherwise so the site
 * still works (the WhatsApp handoff is unaffected).
 */
export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: "db_not_configured" }, { status: 503 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const { tourSlug, date, timeSlot, guests, name, email, phone, notes } = body ?? {};
    if (!tourSlug || !date || !name || !email) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email))) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }
    const booking = await createBookingRequest({
      tourSlug: String(tourSlug),
      date: String(date),
      timeSlot: timeSlot ? String(timeSlot) : undefined,
      guests: Number(guests) || 1,
      name: String(name),
      email: String(email),
      phone: phone ? String(phone) : undefined,
      notes: notes ? String(notes) : undefined,
    });
    return NextResponse.json({ ok: true, id: booking.id, token: booking.confirmationToken });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const status = msg === "unknown_tour" || msg === "bad_date" ? 400 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
