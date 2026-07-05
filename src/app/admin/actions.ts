"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, checkPassword, setSession, clearSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { confirmBooking, markPaid, cancelBooking } from "@/lib/bookings";

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") || "");
  if (!checkPassword(password)) redirect("/admin/login?error=1");
  await setSession();
  redirect("/admin");
}

export async function logoutAction() {
  await clearSession();
  redirect("/admin/login");
}

export async function confirmAction(formData: FormData) {
  await requireAdmin();
  await confirmBooking(String(formData.get("id")));
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
}

export async function markPaidAction(formData: FormData) {
  await requireAdmin();
  const method = String(formData.get("method") || "cash") as "cash" | "transfer" | "manual";
  await markPaid(String(formData.get("id")), method, String(formData.get("collectedBy") || "") || undefined);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
}

export async function cancelAction(formData: FormData) {
  await requireAdmin();
  await cancelBooking(String(formData.get("id")), String(formData.get("reason") || "") || undefined);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
}

// ---- Availability ----

export async function blockSlotAction(formData: FormData) {
  await requireAdmin();
  await db.availabilitySlot.update({
    where: { id: String(formData.get("id")) },
    data: { status: "blocked" },
  });
  revalidatePath("/admin/calendar");
}

export async function openSlotAction(formData: FormData) {
  await requireAdmin();
  await db.availabilitySlot.update({
    where: { id: String(formData.get("id")) },
    data: { status: "available" },
  });
  revalidatePath("/admin/calendar");
}

export async function createSlotAction(formData: FormData) {
  await requireAdmin();
  const tourSlug = String(formData.get("tourSlug"));
  const dateStr = String(formData.get("date"));
  // Compound unique (tourSlug,date,timeSlot) requires a non-null timeSlot.
  const timeSlot = String(formData.get("timeSlot") || "").trim() || "00:00";
  const capacity = Math.max(1, Number(formData.get("capacity") || 12));
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  if (!tourSlug || Number.isNaN(date.getTime())) return;

  await db.availabilitySlot.upsert({
    where: { tourSlug_date_timeSlot: { tourSlug, date, timeSlot } },
    update: { capacity, capacityRemaining: capacity, status: "available", archivedAt: null },
    create: { tourSlug, date, timeSlot, capacity, capacityRemaining: capacity },
  });
  revalidatePath("/admin/calendar");
}
