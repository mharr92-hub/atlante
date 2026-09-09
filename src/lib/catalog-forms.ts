/**
 * Traducción entre los campos JSON de `Product` y los controles de texto de
 * `/admin/catalogo`.
 *
 * Vive fuera de la página (y sin Prisma) para poder probarlo: un horario o una
 * tabla de precios mal parseada se lleva por delante el funnel entero.
 *
 * Nada de esto inventa datos: lo que el formulario deja vacío se guarda vacío.
 */
import type { Localized, PriceRow, Schedule } from "@/content/catalog";

const HHMM = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/** "17:30" normalizado a dos dígitos, o `null` si no es una hora. */
export function parseTime(raw: string): string | null {
  const match = HHMM.exec(raw.trim());
  if (!match) return null;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

/** "17:30-19:00, 20:00-21:30" → `[{ start, end }, …]`. */
export function parseTimes(raw: string): { start: string; end?: string }[] {
  const times: { start: string; end?: string }[] = [];
  for (const chunk of (raw ?? "").split(/[,\n]/)) {
    if (!chunk.trim()) continue;
    const [rawStart, rawEnd] = chunk.split("-");
    const start = parseTime(rawStart ?? "");
    if (!start) continue;
    const end = rawEnd ? parseTime(rawEnd) : null;
    times.push(end ? { start, end } : { start });
  }
  return times;
}

export function formatTimes(times: { start: string; end?: string }[] | undefined): string {
  return (times ?? []).map((t) => (t.end ? `${t.start}-${t.end}` : t.start)).join(", ");
}

/** Los `weekdays` marcados en el formulario (0 = domingo), ordenados. */
export function parseWeekdays(values: readonly string[]): number[] {
  const days = new Set<number>();
  for (const value of values) {
    const day = Number(value);
    if (Number.isInteger(day) && day >= 0 && day <= 6) days.add(day);
  }
  return [...days].sort((a, b) => a - b);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseISODate(raw: string): string | null {
  const value = (raw ?? "").trim();
  return ISO_DATE.test(value) ? value : null;
}

export interface ScheduleForm {
  weekdays: readonly string[];
  times: string;
  validFrom: string;
  noteEs: string;
  noteEn: string;
}

/** `null` cuando el producto no tiene calendario (ni días ni horarios ni nota). */
export function parseSchedule(form: ScheduleForm): Schedule | null {
  const weekdays = parseWeekdays(form.weekdays);
  const times = parseTimes(form.times);
  const validFrom = parseISODate(form.validFrom);
  const note = localizedOrNull(form.noteEs, form.noteEn);

  if (weekdays.length === 0 && times.length === 0 && !validFrom && !note) return null;

  return {
    weekdays,
    times,
    ...(validFrom ? { validFrom } : {}),
    ...(note ? { note } : {}),
  };
}

/** `{ es, en }`; el inglés cae al español cuando está vacío. */
export function localized(es: string, en: string): Localized {
  const spanish = (es ?? "").trim();
  const english = (en ?? "").trim();
  return { es: spanish, en: english || spanish };
}

export function localizedOrNull(es: string, en: string): Localized | null {
  const value = localized(es, en);
  return value.es || value.en ? value : null;
}

/** Dos textareas (una por idioma) → `Localized[]`, emparejadas por línea. */
export function parseLocalizedLines(es: string, en: string): Localized[] {
  const spanish = lines(es);
  const english = lines(en);
  return spanish.map((text, i) => ({ es: text, en: english[i]?.trim() || text }));
}

export function formatLocalizedLines(list: Localized[] | undefined, locale: "es" | "en"): string {
  return (list ?? []).map((item) => item[locale]).join("\n");
}

function lines(raw: string): string[] {
  return (raw ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Tabla de precios, una fila por línea: `key | etiqueta ES | etiqueta EN | precio`.
 * Sin `key` se deriva de la etiqueta; sin precio válido la fila se descarta.
 */
export function parsePriceTable(raw: string): PriceRow[] {
  const rows: PriceRow[] = [];
  for (const line of lines(raw)) {
    const parts = line.split("|").map((part) => part.trim());
    const price = Number(parts[3] ?? parts[2] ?? "");
    if (!Number.isFinite(price) || price < 0) continue;

    const labelEs = parts[1] || parts[0];
    if (!labelEs) continue;
    const key = slugifyKey(parts[0] || labelEs) || `categoria-${rows.length + 1}`;

    rows.push({ key, label: localized(labelEs, parts[2] ?? ""), price });
  }
  return rows;
}

export function formatPriceTable(rows: PriceRow[] | undefined): string {
  return (rows ?? [])
    .map((row) => `${row.key} | ${row.label.es} | ${row.label.en} | ${row.price}`)
    .join("\n");
}

/** "Adulto nacional" → "adulto-nacional". */
export function slugifyKey(raw: string): string {
  return (raw ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Número del formulario, o `null` si está vacío o fuera de rango. */
export function parseNumber(raw: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const value = Number(text);
  if (!Number.isFinite(value) || value < min || value > max) return null;
  return value;
}

export function parseIntOrNull(raw: unknown, min = 0, max = 100_000): number | null {
  const value = parseNumber(raw, min, max);
  return value === null ? null : Math.trunc(value);
}

/** Una lista de rutas de imagen, una por línea. */
export function parseImages(raw: string): string[] {
  return lines(raw);
}
