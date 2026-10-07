import { format, isValid, parseISO } from "date-fns";

/** Uma data de filtro é um dia do calendário local, sem conversão para UTC. */
export function parseDateInput(value: string | null): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = parseISO(value);
  return isValid(date) && format(date, "yyyy-MM-dd") === value ? date : undefined;
}

export function formatDateInput(date: Date): string {
  return format(date, "yyyy-MM-dd");
}
