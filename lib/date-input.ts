import { format, isValid, parseISO } from "date-fns";

/** A filter date is a local calendar day, with no conversion to UTC. */
export function parseDateInput(value: string | null): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = parseISO(value);
  return isValid(date) && format(date, "yyyy-MM-dd") === value ? date : undefined;
}

export function formatDateInput(date: Date): string {
  return format(date, "yyyy-MM-dd");
}
