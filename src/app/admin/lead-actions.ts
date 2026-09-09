"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { commissionPctFor } from "@/lib/catalog";
import { getDb } from "@/lib/db";

function refresh() {
  revalidatePath("/admin");
  revalidatePath("/admin/leads");
  revalidatePath("/admin/comisiones");
}

/**
 * Conciliación manual del modo puente: Mark cruza el export de PEX
 * (`referral_code = ATLANTE`) y marca aquí lo que se pagó.
 */
export async function markLeadPaidAction(formData: FormData) {
  await requireAdmin();
  const db = getDb();
  if (!db) return;

  const id = String(formData.get("id") || "");
  const pexBookingId = String(formData.get("pexBookingId") || "").trim();
  const amount = Number(formData.get("amount"));
  if (!id || !Number.isFinite(amount) || amount < 0) return;

  // La comisión del producto manda; sin ella, `ATLANTE_COMMISSION_PCT`.
  const lead = await db.lead.findUnique({
    where: { id },
    select: { productSlug: true, vesselSlug: true },
  });
  if (!lead) return;
  const pct = await commissionPctFor(lead.productSlug ?? lead.vesselSlug);

  await db.lead.update({
    where: { id },
    data: {
      status: "paid",
      pexBookingId: pexBookingId || null,
      amount,
      commissionPct: pct,
      commissionAmount: Math.round(((amount * pct) / 100) * 100) / 100,
      paidAt: new Date(),
    },
  });
  refresh();
}

export async function markLeadLostAction(formData: FormData) {
  await requireAdmin();
  const db = getDb();
  if (!db) return;

  const id = String(formData.get("id") || "");
  if (!id) return;

  await db.lead.update({
    where: { id },
    data: { status: "lost", commissionAmount: 0, paidAt: null },
  });
  refresh();
}

export async function saveLeadNoteAction(formData: FormData) {
  await requireAdmin();
  const db = getDb();
  if (!db) return;

  const id = String(formData.get("id") || "");
  const notes = String(formData.get("notes") || "").slice(0, 2000);
  if (!id) return;

  await db.lead.update({ where: { id }, data: { notes: notes || null } });
  refresh();
}
