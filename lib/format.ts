import { TZDate } from "@date-fns/tz";

/** pt-BR formatting, always in the São Paulo time zone (docs/archive/admin-plan.md §6). */
const TIME_ZONE = "America/Sao_Paulo";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  dateStyle: "short",
  timeStyle: "short",
});
const relative = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
const number = new Intl.NumberFormat("pt-BR");

export function formatDateTime(value: Date | string | number): string {
  return dateTime.format(new Date(value));
}

export function formatNumber(value: number): string {
  return number.format(value);
}

/** "há 5 minutos", "ontem"… (relative to `now`, for tests and stable rendering). */
export function formatRelative(value: Date | string | number, now = Date.now()): string {
  const seconds = Math.round((new Date(value).getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  // No seconds count: it changes on every render and helps nobody.
  if (abs < 60) return "agora mesmo";
  if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return relative.format(Math.round(seconds / 3600), "hour");
  if (abs < 2_592_000) return relative.format(Math.round(seconds / 86_400), "day");
  if (abs < 31_536_000) return relative.format(Math.round(seconds / 2_592_000), "month");
  return relative.format(Math.round(seconds / 31_536_000), "year");
}

/** "2026-10-06" → start of the day in São Paulo (as a UTC Date). */
export function startOfDayInSaoPaulo(day: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return undefined;
  const [, y, m, d] = match.map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(new TZDate(y, m - 1, d, 0, 0, 0, TIME_ZONE).getTime());
}

/** End of the day in São Paulo (start of the next day), for "até" (until) filters. */
export function endOfDayInSaoPaulo(day: string): Date | undefined {
  const start = startOfDayInSaoPaulo(day);
  if (!start) return undefined;
  const [y, m, d] = day.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(new TZDate(y, m - 1, d + 1, 0, 0, 0, TIME_ZONE).getTime());
}

/** Short duration in pt-BR: "45 s", "12 min", "1 h 05 min". */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) return `${total} s`;
  const minutes = Math.floor(total / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${String(minutes % 60).padStart(2, "0")} min`;
}

/** Duration between two dates; without an end, "em andamento". */
export function formatSpan(start: Date | string, end: Date | string | null): string {
  if (!end) return "em andamento";
  return formatDuration((new Date(end).getTime() - new Date(start).getTime()) / 1000);
}
