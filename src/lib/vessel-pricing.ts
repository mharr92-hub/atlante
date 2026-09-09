/**
 * Precio por persona, filtros y orden del marketplace de charters (bloque 4.2).
 *
 * Funciones puras, sin Prisma ni `server-only`: las comparten el listado
 * (cliente), la ficha, el comparador, la home y los tests.
 *
 * La regla del precio por persona es la de PEX: se busca **el tramo de capacidad
 * que cubre al grupo** y se divide el precio del barco completo entre las
 * personas. Si ningún tramo publicado cubre al grupo, no hay precio: se dice
 * "consultar" en vez de extrapolar (regla 3).
 */
import type { Operator, PricingRow, Vessel } from "@/content/vessels";

/** Rutas conocidas, en el orden en que PEX las publica. */
export const ROUTES = ["bahia", "taboga", "perlas"] as const;

/** Jornadas que publica PEX. */
export const DURATIONS = [4, 8, 12] as const;

/** Grupo por defecto del control "¿Cuántas personas?" (listado y home). */
export const DEFAULT_PEOPLE = 15;

/** Tope del comparador (PRD 5.7). */
export const MAX_COMPARE = 4;

export interface GroupQuery {
  /** Tamaño del grupo. Sin él no hay precio por persona. */
  people?: number;
  /** Filtra por jornada (4, 8 o 12 h). */
  hours?: number | null;
  /** Filtra por ruta (`bahia`, `taboga`, `perlas`). */
  route?: string | null;
}

/** Redondeo a centavos: $1,300 ÷ 15 = $86.67. */
export function toCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Las filas que sirven para una consulta: las de la ruta y la duración pedidas
 * que además cubren al grupo. Sin `people` no se filtra por capacidad.
 */
export function matchingRows(vessel: Vessel, query: GroupQuery = {}): PricingRow[] {
  const { people, hours, route } = query;
  return vessel.pricing.filter((row) => {
    if (route && row.route !== route) return false;
    if (hours && row.hours !== hours) return false;
    if (people && people > 0 && row.capacityMax < people) return false;
    return true;
  });
}

/** La fila más barata de las que sirven, o `null` si ninguna cubre al grupo. */
export function rowForGroup(vessel: Vessel, query: GroupQuery = {}): PricingRow | null {
  const rows = matchingRows(vessel, query);
  if (rows.length === 0) return null;
  return rows.reduce((best, row) =>
    row.price < best.price || (row.price === best.price && row.capacityMax < best.capacityMax)
      ? row
      : best,
  );
}

/** El tramo más barato de la nave: el "desde $1,300 (4 h · hasta 15 pax)". */
export function cheapestRow(vessel: Vessel): PricingRow | null {
  return rowForGroup(vessel, {});
}

/**
 * "desde $X por persona" para un grupo: precio del tramo que lo cubre ÷ personas.
 * `null` cuando el grupo no cabe en ningún tramo publicado.
 */
export function pricePerPerson(vessel: Vessel, query: GroupQuery): number | null {
  const people = query.people ?? 0;
  if (!Number.isFinite(people) || people <= 0) return null;
  const row = rowForGroup(vessel, query);
  return row ? toCents(row.price / people) : null;
}

/** Las jornadas publicadas de una nave, ordenadas. */
export function durationsOf(vessel: Vessel): number[] {
  return [...new Set(vessel.pricing.map((row) => row.hours))].sort((a, b) => a - b);
}

/** Las rutas con precio publicado, en el orden de `ROUTES`. */
export function routesOf(vessel: Vessel): string[] {
  const declared = new Set(vessel.routes);
  const priced = new Set(vessel.pricing.map((row) => row.route));
  const all = [...new Set([...declared, ...priced])];
  return all.sort((a, b) => routeOrder(a) - routeOrder(b));
}

function routeOrder(route: string): number {
  const index = (ROUTES as readonly string[]).indexOf(route);
  return index === -1 ? ROUTES.length : index;
}

// ---------------------------------------------------------------- filtros ----

export interface VesselFilters {
  /** Tamaño del grupo del control "¿Cuántas personas?". No descarta naves. */
  people?: number;
  /** Capacidad mínima de la nave. */
  minCapacity?: number;
  /** Presupuesto máximo por barco. */
  maxBudget?: number;
  hours?: number | null;
  route?: string | null;
  type?: string | null;
  marina?: string | null;
}

/**
 * Filtros del listado. `people` no descarta naves: sólo cambia el precio que se
 * muestra (una nave sin tramo que cubra al grupo aparece con "consultar").
 */
export function filterVessels(list: Vessel[], filters: VesselFilters = {}): Vessel[] {
  const { minCapacity, maxBudget, hours, route, type, marina } = filters;

  return list.filter((vessel) => {
    if (!vessel.active) return false;
    if (minCapacity && vessel.capacityMax < minCapacity) return false;
    if (type && vessel.type !== type) return false;
    if (marina && vessel.marina !== marina) return false;

    const rows = matchingRows(vessel, { hours, route });
    if ((hours || route) && rows.length === 0) return false;
    if (maxBudget && !rows.some((row) => row.price <= maxBudget)) return false;

    return true;
  });
}

/**
 * Orden por precio por persona (el del PRD 5.7). Las naves sin precio para ese
 * grupo van al final, y a igualdad manda el `order` del catálogo.
 */
export function sortByPricePerPerson(
  list: Vessel[],
  query: GroupQuery = {},
): Vessel[] {
  return [...list].sort((a, b) => {
    const pa = pricePerPerson(a, query);
    const pb = pricePerPerson(b, query);
    if (pa === null && pb === null) return a.order - b.order;
    if (pa === null) return 1;
    if (pb === null) return -1;
    return pa - pb || a.order - b.order;
  });
}

// ----------------------------------------------------------- verificación ----

/**
 * Sello "Operador verificado" (bloque 4.3): sólo se muestra con los **tres**
 * del checklist —licencia AMP, seguro vigente y contrato firmado— y con la
 * casilla que Mark marca en `/admin/operadores`. Falta uno: no hay sello.
 */
export function operatorSealVisible(
  operator: Operator | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!operator || !operator.active || !operator.verified) return false;
  if (!operator.ampLicense || !operator.contractSignedAt || !operator.insuranceUntil) return false;
  const until = Date.parse(`${operator.insuranceUntil}T23:59:59.999Z`);
  return Number.isFinite(until) && until >= now.getTime();
}

/** Valores de "tipo" y "marina" presentes en la lista, para armar los selectores. */
export function facets(list: Vessel[]): { types: string[]; marinas: string[] } {
  return {
    types: [...new Set(list.map((v) => v.type))].sort(),
    marinas: [...new Set(list.map((v) => v.marina))].sort(),
  };
}
