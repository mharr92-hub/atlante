/**
 * CSV para Excel y Google Sheets.
 *
 * UTF-8 con BOM (sin él Excel rompe los acentos), coma como separador y CRLF.
 * Lo comparten el export de leads y el de comisiones.
 */
import "server-only";

const BOM = "﻿";

/** Escapa un valor: comillas dobladas y entrecomillado si hace falta. */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function csvRow(values: readonly unknown[]): string {
  return values.map(csvCell).join(",");
}

/** Documento completo, listo para responder. */
export function csvDocument(
  columns: readonly string[],
  rows: readonly (readonly unknown[])[],
): string {
  return `${BOM}${[csvRow(columns), ...rows.map(csvRow)].join("\r\n")}\r\n`;
}

/** Cabeceras de descarga con nombre `atlante-<name>-<fecha>.csv`. */
export function csvHeaders(name: string, stamp = new Date().toISOString().slice(0, 10)) {
  return {
    "content-type": "text/csv; charset=utf-8",
    "content-disposition": `attachment; filename="atlante-${name}-${stamp}.csv"`,
    "cache-control": "no-store",
  };
}
