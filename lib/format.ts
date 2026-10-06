import { TZDate } from "@date-fns/tz";

/** Formatação pt-BR, sempre no fuso de São Paulo (docs/PLANO-ADMIN.md §6). */
export const TIME_ZONE = "America/Sao_Paulo";

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

/** "há 5 minutos", "ontem"… (a partir de `now`, para testes e renderização estável). */
export function formatRelative(value: Date | string | number, now = Date.now()): string {
  const seconds = Math.round((new Date(value).getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  // Sem contagem de segundos: muda a cada render e não ajuda ninguém.
  if (abs < 60) return "agora mesmo";
  if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return relative.format(Math.round(seconds / 3600), "hour");
  if (abs < 2_592_000) return relative.format(Math.round(seconds / 86_400), "day");
  if (abs < 31_536_000) return relative.format(Math.round(seconds / 2_592_000), "month");
  return relative.format(Math.round(seconds / 31_536_000), "year");
}

/** "2026-10-06" → início do dia em São Paulo (como Date em UTC). */
export function startOfDayInSaoPaulo(day: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return undefined;
  const [, y, m, d] = match.map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(new TZDate(y, m - 1, d, 0, 0, 0, TIME_ZONE).getTime());
}

/** Fim do dia em São Paulo (início do dia seguinte), para filtros "até". */
export function endOfDayInSaoPaulo(day: string): Date | undefined {
  const start = startOfDayInSaoPaulo(day);
  if (!start) return undefined;
  const [y, m, d] = day.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(new TZDate(y, m - 1, d + 1, 0, 0, 0, TIME_ZONE).getTime());
}

/** Duração curta em pt-BR: "45 s", "12 min", "1 h 05 min". */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) return `${total} s`;
  const minutes = Math.floor(total / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${String(minutes % 60).padStart(2, "0")} min`;
}

/** Duração entre duas datas; sem fim, "em andamento". */
export function formatSpan(start: Date | string, end: Date | string | null): string {
  if (!end) return "em andamento";
  return formatDuration((new Date(end).getTime() - new Date(start).getTime()) / 1000);
}
