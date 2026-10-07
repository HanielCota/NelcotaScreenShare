/**
 * CSV para o Excel em pt-BR: separador ";", UTF-8 com BOM e proteção contra
 * CSV injection (célula que começa com = + - @ tab ou CR vira texto, com ').
 */
/** Marca de ordem de bytes: faz o Excel abrir o UTF-8 com acentos. */
export const CSV_BOM = String.fromCharCode(0xfeff);
const SEPARATOR = ";";
const FORMULA_START = /^[=+\-@\t\r]/;

function cellText(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  switch (typeof value) {
    case "string":
      return value;
    case "number":
    case "bigint":
    case "boolean":
      return value.toString();
    default:
      return JSON.stringify(value) ?? "";
  }
}

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = cellText(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[";\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function csvRow(values: unknown[]): string {
  return `${values.map(csvCell).join(SEPARATOR)}\r\n`;
}
