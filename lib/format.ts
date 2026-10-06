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
