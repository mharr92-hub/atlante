/**
 * Reporte de comisiones (bloque 3.4).
 *
 * Funciones puras: agrupan los leads pagados de un mes por producto o nave y
 * calculan la comisión. La consulta a Prisma vive en la página y en el export,
 * que comparten esto para que el CSV coincida siempre con la tabla.
 *
 * La comisión NO se recalcula aquí: se suma la que quedó guardada en el lead
 * cuando se marcó pagado (webhook o admin), porque el porcentaje del producto
 * puede haber cambiado después. El `%` que se muestra es el efectivo:
 * comisión ÷ monto.
 */

const MONTH_RE = /^(\d{4})-(\d{2})$/;

export interface MonthRange {
  /** `YYYY-MM` normalizado. */
  month: string;
  /** Inicio del mes, inclusive (UTC). */
  from: Date;
  /** Inicio del mes siguiente, exclusivo (UTC). */
  to: Date;
}

/** `2026-09` → rango del mes. Un valor inválido cae al mes de `now`. */
export function monthBounds(month: string | undefined, now: Date = new Date()): MonthRange {
  const match = MONTH_RE.exec(month ?? "");
  const year = match ? Number(match[1]) : now.getUTCFullYear();
  const index = match ? Number(match[2]) - 1 : now.getUTCMonth();

  if (!match || index < 0 || index > 11) {
    return monthBounds(
      `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`,
      now,
    );
  }

  return {
    month: `${year}-${String(index + 1).padStart(2, "0")}`,
    from: new Date(Date.UTC(year, index, 1)),
    to: new Date(Date.UTC(year, index + 1, 1)),
  };
}

/** Los últimos `count` meses en formato `YYYY-MM`, del más reciente al más viejo. */
export function recentMonths(count = 12, now: Date = new Date()): string[] {
  const months: string[] = [];
  for (let i = 0; i < count; i++) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push(
      `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
    );
  }
  return months;
}

export interface PaidLead {
  productSlug: string | null;
  vesselSlug: string | null;
  amount: number;
  commissionAmount: number;
  /** Código del aliado que trajo el lead, si lo hubo (bloque 5.1). */
  partnerCode?: string | null;
}

export interface CommissionRow {
  slug: string;
  label: string;
  leads: number;
  amount: number;
  commission: number;
  /** Comisión ÷ monto × 100, o `null` cuando el monto es 0. */
  effectivePct: number | null;
}

const UNASSIGNED = "(sin producto)";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function pct(commission: number, amount: number): number | null {
  if (amount <= 0) return null;
  return round2((commission / amount) * 100);
}

/**
 * Agrupa por producto (o nave) y ordena por comisión descendente.
 * `label` traduce el slug a nombre legible; si no lo conoce, se muestra el slug.
 */
export function summarizeCommissions(
  leads: PaidLead[],
  label: (slug: string) => string = (slug) => slug,
): { rows: CommissionRow[]; total: CommissionRow } {
  const bySlug = new Map<string, CommissionRow>();

  for (const lead of leads) {
    const slug = lead.productSlug ?? lead.vesselSlug ?? UNASSIGNED;
    const row = bySlug.get(slug) ?? {
      slug,
      label: slug === UNASSIGNED ? UNASSIGNED : label(slug),
      leads: 0,
      amount: 0,
      commission: 0,
      effectivePct: null,
    };
    row.leads += 1;
    row.amount = round2(row.amount + lead.amount);
    row.commission = round2(row.commission + lead.commissionAmount);
    bySlug.set(slug, row);
  }

  const rows = [...bySlug.values()]
    .map((row) => ({ ...row, effectivePct: pct(row.commission, row.amount) }))
    .sort((a, b) => b.commission - a.commission || a.label.localeCompare(b.label));

  const amount = round2(rows.reduce((sum, r) => sum + r.amount, 0));
  const commission = round2(rows.reduce((sum, r) => sum + r.commission, 0));

  return {
    rows,
    total: {
      slug: "",
      label: "Total",
      leads: rows.reduce((sum, r) => sum + r.leads, 0),
      amount,
      commission,
      effectivePct: pct(commission, amount),
    },
  };
}

// ------------------------------------------- reparto con aliados (bloque 5) --

/**
 * Reparto de la comisión con los aliados (bloque 5.1).
 *
 *   comisión de Atlante = monto × `commissionPct`  → ya viene guardada en el lead
 *   parte del aliado    = monto × `Reseller.commissionPercent`
 *   neto de Atlante     = comisión − parte del aliado
 *
 * Los dos porcentajes se aplican sobre el MONTO de la reserva, no uno sobre el
 * otro: es lo que fija el bloque 5.1. Qué porcentaje lleva cada aliado lo decide
 * Mark en `/admin/aliados`; no hay reparto por defecto (PENDIENTE MARK).
 */

/** Lo que se sabe del aliado al armar el reporte. */
export interface PartnerShare {
  name: string;
  /** `Reseller.commissionPercent`. */
  commissionPercent: number;
}

export interface PartnerCommissionRow {
  /** Código del aliado; cadena vacía en la fila "sin aliado". */
  code: string;
  label: string;
  leads: number;
  amount: number;
  /** Comisión bruta de Atlante (la guardada en el lead). */
  commission: number;
  /** `Reseller.commissionPercent`, o `null` si el código no resuelve. */
  partnerPct: number | null;
  /** monto × `partnerPct`, o `null` si no se conoce el porcentaje. */
  partnerShare: number | null;
  /** comisión − parte del aliado, o `null` si el reparto no se puede calcular. */
  net: number | null;
}

const NO_PARTNER = "(sin aliado)";

export function summarizePartnerCommissions(
  leads: PaidLead[],
  partner: (code: string) => PartnerShare | null | undefined = () => null,
): { rows: PartnerCommissionRow[]; total: PartnerCommissionRow; unresolved: number } {
  const byCode = new Map<string, PartnerCommissionRow>();

  for (const lead of leads) {
    const code = (lead.partnerCode ?? "").trim();
    const row = byCode.get(code) ?? {
      code,
      label: code ? (partner(code)?.name ?? code) : NO_PARTNER,
      leads: 0,
      amount: 0,
      commission: 0,
      // Sin aliado no hay nada que repartir: 0 conocido, no "se desconoce".
      partnerPct: code ? (partner(code)?.commissionPercent ?? null) : null,
      partnerShare: null,
      net: null,
    };
    row.leads += 1;
    row.amount = round2(row.amount + lead.amount);
    row.commission = round2(row.commission + lead.commissionAmount);
    byCode.set(code, row);
  }

  let unresolved = 0;
  const rows = [...byCode.values()]
    .map((row) => {
      if (!row.code) {
        return { ...row, partnerShare: 0, net: row.commission };
      }
      if (row.partnerPct === null) {
        // Código sin aliado activo que lo respalde: no se inventa el reparto.
        unresolved += 1;
        return row;
      }
      const share = round2((row.amount * row.partnerPct) / 100);
      return { ...row, partnerShare: share, net: round2(row.commission - share) };
    })
    .sort((a, b) => b.commission - a.commission || a.label.localeCompare(b.label));

  const amount = round2(rows.reduce((sum, r) => sum + r.amount, 0));
  const commission = round2(rows.reduce((sum, r) => sum + r.commission, 0));
  const partnerShare = round2(rows.reduce((sum, r) => sum + (r.partnerShare ?? 0), 0));

  return {
    rows,
    unresolved,
    total: {
      code: "",
      label: "Total",
      leads: rows.reduce((sum, r) => sum + r.leads, 0),
      amount,
      commission,
      partnerPct: null,
      partnerShare,
      // Con un código sin resolver el neto no se puede afirmar: se muestra "—".
      net: unresolved > 0 ? null : round2(commission - partnerShare),
    },
  };
}
