/**
 * Persist charter deposit requests when DATABASE_URL is set.
 * Preview / Phase-1 deploys without Postgres still capture the lead in logs
 * and can skip PagueloFácil until Mark wires DB + PF credentials.
 */
import "server-only";
import { randomBytes } from "crypto";
import type { PrismaClient } from "@prisma/client";
import {
  depositFromSample,
  DEPOSIT_PERCENT,
  getDuration,
  getLiveCharter,
  type Charter,
  type CharterDuration,
} from "@/data/charters";

async function getDb(): Promise<PrismaClient | null> {
  if (!process.env.DATABASE_URL) return null;
  const { db } = await import("@/lib/db");
  return db;
}

export interface CharterLeadInput {
  slug: string;
  durationId: string;
  date: string;
  guests: number;
  name: string;
  whatsapp: string;
}

export interface CharterLeadRecord {
  id: string;
  token: string;
  slug: string;
  durationId: string;
  hours: number;
  date: string;
  guests: number;
  name: string;
  whatsapp: string;
  sampleTotalUsd: number | null;
  depositAmount: number;
  persisted: boolean;
}

function token(): string {
  return randomBytes(16).toString("hex");
}

export function validateCharterLead(input: CharterLeadInput): {
  charter: Charter;
  duration: CharterDuration;
  guests: number;
  date: Date;
  name: string;
  whatsapp: string;
} {
  const charter = getLiveCharter(input.slug);
  if (!charter) throw new Error("unknown_charter");

  const duration = getDuration(charter, input.durationId);
  if (!duration) throw new Error("unknown_duration");

  const name = input.name.trim();
  if (name.length < 2) throw new Error("bad_name");

  const whatsapp = input.whatsapp.replace(/[^\d+]/g, "");
  if (whatsapp.replace(/\D/g, "").length < 8) throw new Error("bad_whatsapp");

  const max = charter.maxPax ?? 99;
  const guests = Math.max(1, Math.min(Number(input.guests) || 1, max));

  const date = new Date(`${input.date}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error("bad_date");
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (date.getTime() < today.getTime()) throw new Error("date_in_past");

  return { charter, duration, guests, date, name, whatsapp };
}

export async function createCharterLead(input: CharterLeadInput): Promise<CharterLeadRecord> {
  const { charter, duration, guests, date, name, whatsapp } = validateCharterLead(input);
  const sampleTotalUsd = duration.sampleTotalUsd;
  const depositAmount = sampleTotalUsd != null ? depositFromSample(sampleTotalUsd) : 0;
  const id = crypto.randomUUID();
  const confirmationToken = token();
  const isoDate = input.date;

  const record: CharterLeadRecord = {
    id,
    token: confirmationToken,
    slug: charter.slug,
    durationId: duration.id,
    hours: duration.hours,
    date: isoDate,
    guests,
    name,
    whatsapp,
    sampleTotalUsd,
    depositAmount,
    persisted: false,
  };

  console.log("[charter-lead]", {
    slug: record.slug,
    durationId: record.durationId,
    date: record.date,
    guests: record.guests,
    name: record.name,
    whatsapp: record.whatsapp,
    depositAmount: record.depositAmount,
    sampleTotalUsd: record.sampleTotalUsd,
    pricesAreSample: true,
  });

  if (!process.env.DATABASE_URL) return record;

  try {
    const db = await getDb();
    if (!db) return record;
    const row = await db.charterRequest.create({
      data: {
        id,
        slug: charter.slug,
        durationId: duration.id,
        hours: duration.hours,
        bookingDate: date,
        guestCount: guests,
        customerName: name,
        customerWhatsapp: whatsapp,
        sampleTotalUsd: sampleTotalUsd ?? undefined,
        depositAmount,
        depositPercent: DEPOSIT_PERCENT,
        confirmationToken,
      },
    });
    return { ...record, id: row.id, token: row.confirmationToken, persisted: true };
  } catch (err) {
    console.error("[charter-lead] persist failed", err);
    return record;
  }
}

export async function getCharterLeadById(id: string) {
  const db = await getDb();
  if (!db) return null;
  try {
    return await db.charterRequest.findUnique({ where: { id } });
  } catch {
    return null;
  }
}

export async function getCharterLeadByToken(confirmationToken: string) {
  const db = await getDb();
  if (!db) return null;
  try {
    return await db.charterRequest.findUnique({ where: { confirmationToken } });
  } catch {
    return null;
  }
}

export async function attachPagueloFacilLink(id: string, code: string) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.charterRequest.update({
      where: { id },
      data: { paguelofacilLinkCode: code },
    });
  } catch (err) {
    console.error("[charter-lead] attach link failed", err);
  }
}

export async function markCharterDepositPaid(opts: {
  id: string;
  oper: string;
  expectedDeposit: number;
}) {
  const db = await getDb();
  if (!db) return { applied: false as const, reason: "no_db" };
  try {
    const current = await db.charterRequest.findUnique({ where: { id: opts.id } });
    if (!current) return { applied: false as const, reason: "not_found" };
    if (current.paymentStatus === "paid") {
      return { applied: false as const, reason: "already_paid" };
    }
    const expected = Number(current.depositAmount);
    if (Math.abs(expected - opts.expectedDeposit) > 0.015) {
      return { applied: false as const, reason: "amount_mismatch" };
    }
    await db.charterRequest.update({
      where: { id: opts.id },
      data: {
        paymentStatus: "paid",
        status: "pending",
        charterConfirmation: "awaiting",
        paguelofacilOperationId: opts.oper,
        paymentRef: `pf_${opts.oper}`,
      },
    });
    return { applied: true as const };
  } catch (err) {
    console.error("[charter-lead] mark paid failed", err);
    return { applied: false as const, reason: "error" };
  }
}
