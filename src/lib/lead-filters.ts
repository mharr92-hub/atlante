import "server-only";
import type { Prisma } from "@prisma/client";

/** Filtros de `/admin/leads`, tal como llegan por la URL. */
export interface LeadSearch {
  status?: string;
  type?: string;
  from?: string;
  to?: string;
  productSlug?: string;
  partnerCode?: string;
}

export const LEAD_STATUSES = [
  "created",
  "redirected",
  "paid",
  "paid_unmatched",
  "lost",
  "quote_requested",
  "quoted",
  "accepted",
] as const;

export const LEAD_TYPES = ["tour", "party", "ferry", "charter_pex", "charter_partner"] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Traduce los filtros de la URL a un `where` de Prisma. Lo comparten la tabla
 *  y el export CSV para que el archivo siempre coincida con lo que se ve. */
export function buildLeadWhere(search: LeadSearch): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {};

  if (search.status && (LEAD_STATUSES as readonly string[]).includes(search.status)) {
    where.status = search.status as (typeof LEAD_STATUSES)[number];
  }
  if (search.type && (LEAD_TYPES as readonly string[]).includes(search.type)) {
    where.type = search.type as (typeof LEAD_TYPES)[number];
  }
  if (search.productSlug) {
    where.OR = [{ productSlug: search.productSlug }, { vesselSlug: search.productSlug }];
  }
  if (search.partnerCode) {
    where.partnerCode = { contains: search.partnerCode, mode: "insensitive" };
  }

  const createdAt: Prisma.DateTimeFilter = {};
  if (search.from && ISO_DATE.test(search.from)) {
    createdAt.gte = new Date(`${search.from}T00:00:00.000Z`);
  }
  if (search.to && ISO_DATE.test(search.to)) {
    createdAt.lte = new Date(`${search.to}T23:59:59.999Z`);
  }
  if (createdAt.gte || createdAt.lte) where.createdAt = createdAt;

  return where;
}
