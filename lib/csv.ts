/**
 * CSV para o Excel em pt-BR: separador ";", UTF-8 com BOM e proteção contra
 * CSV injection (célula que começa com = + - @ tab ou CR vira texto, com ').
 */
/** Marca de ordem de bytes: faz o Excel abrir o UTF-8 com acentos. */
export const CSV_BOM = String.fromCharCode(0xfeff);
const SEPARATOR = ";";
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text =
    value instanceof Date
      ? value.toISOString()
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[";\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function csvRow(values: unknown[]): string {
  return `${values.map(csvCell).join(SEPARATOR)}\r\n`;
}
