/**
 * Seed script — `npm run db:seed`.
 *
 * Idempotent: safe to re-run. It (1) opens ~60 days of availability slots for
 * each tour/charter and (2) creates a demo coupon. Slug + default departure
 * time mirror src/content/tours.ts (the catalog source of truth); keep them in
 * sync when you add a tour. Prices/capacity live in the catalog — a slot only
 * carries capacity + an optional price override.
 */
import { PrismaClient, SlotStatus } from "@prisma/client";

const db = new PrismaClient();

/** One default daily departure per catalog slug. */
const SCHEDULE: Array<{ slug: string; timeSlot: string; capacity: number }> = [
  { slug: "travesia-al-atardecer", timeSlot: "16:30", capacity: 24 },
  { slug: "escape-a-taboga", timeSlot: "09:00", capacity: 24 },
  { slug: "expedicion-a-las-perlas", timeSlot: "08:00", capacity: 20 },
  // Private charters: whole-vessel, so capacity is the max party size.
  { slug: "charter-atardecer-privado", timeSlot: "16:30", capacity: 12 },
  { slug: "yate-completo-taboga", timeSlot: "09:00", capacity: 12 },
  { slug: "charter-premium-las-perlas", timeSlot: "08:00", capacity: 10 },
];

const DAYS_AHEAD = 60;

function addDaysUTC(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function main() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let created = 0;
  for (const { slug, timeSlot, capacity } of SCHEDULE) {
    for (let i = 1; i <= DAYS_AHEAD; i++) {
      const date = addDaysUTC(today, i);
      await db.availabilitySlot.upsert({
        where: {
          tourSlug_date_timeSlot: { tourSlug: slug, date, timeSlot },
        },
        update: {}, // never stomp live capacity on re-seed
        create: {
          tourSlug: slug,
          date,
          timeSlot,
          capacity,
          capacityRemaining: capacity,
          status: SlotStatus.available,
        },
      });
      created++;
    }
  }
  console.log(`✔ Availability upserted: ${SCHEDULE.length} tours × ${DAYS_AHEAD} days = ${created} slots`);

  await db.coupon.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: { code: "WELCOME10", percentOff: 10, active: true },
  });
  console.log("✔ Demo coupon WELCOME10 (10% off) ready");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
