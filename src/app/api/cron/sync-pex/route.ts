import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { authorizeCron } from "@/lib/cron";
import { clearCatalogCache } from "@/lib/catalog";
import { getDb } from "@/lib/db";
import { feedConfigured } from "@/lib/pex-feed";
import {
  syncPex,
  type ProductCreateFields,
  type ProductFeedFields,
  type SlotFields,
  type SyncDb,
} from "@/lib/sync-pex";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron de sincronización: feed de PEX → `Product` / `ProductSlot` (bloque 3.2).
 *
 * `vercel.json` lo llama cada 15 minutos con `Authorization: Bearer CRON_SECRET`.
 * Nunca devuelve 5xx por un fallo del feed: responde `{ ok: false, reason }` con
 * 200 y deja el snapshot anterior intacto, que es lo que sigue sirviendo al
 * sitio. Mientras `PEX_FEED_URL` no exista, contesta `feed_not_configured` y
 * todo se queda en modo puente.
 */
type Db = NonNullable<ReturnType<typeof getDb>>;

/** `YYYY-MM-DD` → `Date` a medianoche UTC (las columnas son `DATE`). */
function day(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

/** Campos que el feed pisa en cada corrida, en forma de `update` de Prisma. */
function feedUpdate(data: ProductFeedFields) {
  return {
    pexTripId: data.pexTripId,
    pexPath: data.pexPath,
    priceFrom: data.priceFrom,
    priceTable: json(data.priceTable),
    durationMin: data.durationMin,
    capacityMin: data.capacityMin,
    capacityMax: data.capacityMax,
    available: data.available,
    // Un feed sin fotos no borra las que ya había: sólo suma información.
    ...(data.images.length > 0 ? { images: json(data.images) } : {}),
    syncedAt: data.syncedAt,
    verifiedAt: data.verifiedAt,
  };
}

function prismaSyncDb(db: Db): SyncDb {
  return {
    async findProduct(tripId, slug) {
      const byTrip = await db.product.findFirst({
        where: { pexTripId: tripId },
        select: { id: true, slug: true },
      });
      if (byTrip) return byTrip;
      return db.product.findUnique({ where: { slug }, select: { id: true, slug: true } });
    },

    async createProduct(data: ProductCreateFields) {
      return db.product.create({
        data: {
          slug: data.slug,
          kind: data.kind,
          source: "pex",
          priceUnit: data.priceUnit,
          name: json(data.name),
          summary: json(data.summary),
          description: json(data.description),
          durationLabel: json(data.durationLabel),
          policies: json(data.policies),
          sourceUrl: data.sourceUrl,
          images: json(data.images),
          ...feedUpdate(data),
        },
        select: { id: true, slug: true },
      });
    },

    async updateProduct(id, data) {
      await db.product.update({ where: { id }, data: feedUpdate(data) });
    },

    async upsertSlot(data: SlotFields) {
      const fields = {
        productId: data.productId,
        date: day(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        capacityRemaining: data.capacityRemaining,
        price: data.price,
        syncedAt: data.syncedAt,
      };
      await db.productSlot.upsert({
        where: { pexSlotId: data.pexSlotId },
        create: { pexSlotId: data.pexSlotId, ...fields },
        update: fields,
      });
    },

    async deleteStaleSlots(productId, from, to, keep) {
      const { count } = await db.productSlot.deleteMany({
        where: {
          productId,
          date: { gte: day(from), lte: day(to) },
          ...(keep.length > 0 ? { pexSlotId: { notIn: keep } } : {}),
        },
      });
      return count;
    },
  };
}

export async function GET(request: Request) {
  const auth = authorizeCron(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, reason: auth.reason }, { status: auth.status });
  }

  if (!feedConfigured()) {
    return NextResponse.json({ ok: false, reason: "feed_not_configured" });
  }

  const db = getDb();
  if (!db) return NextResponse.json({ ok: false, reason: "no_database" });

  let result;
  try {
    result = await syncPex({ db: prismaSyncDb(db) });
  } catch {
    console.warn("[sync-pex] la escritura falló; se conserva el snapshot anterior");
    return NextResponse.json({ ok: false, reason: "db_error" });
  }

  // El catálogo se sirve con caché de 60 s en proceso: tras escribir, se tira.
  if (result.ok) clearCatalogCache();

  return NextResponse.json(result);
}
