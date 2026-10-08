// CSV for pt-BR Excel: ";" separator, UTF-8 with BOM and protection against
// CSV injection (a cell starting with = + - @ tab or CR becomes text, with ').

/** Byte order mark: makes Excel open the UTF-8 with accents intact. */
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
