import { expect, test } from "vitest";
import { formatDateInput, parseDateInput } from "@/lib/date-input";

test("o filtro preserva o dia local na ida e na volta, inclusive em ano bissexto", () => {
  for (const value of ["2026-10-06", "2024-02-29", "2026-01-01", "2026-12-31"]) {
    const date = parseDateInput(value)!;
    const [year, month, day] = value.split("-").map(Number);
    expect([date.getFullYear(), date.getMonth() + 1, date.getDate()]).toEqual([year, month, day]);
    expect(date.getHours()).toBe(0);
    expect(formatDateInput(date)).toBe(value);
  }
});

test("datas inválidas vindas da URL não são normalizadas para outro dia", () => {
  for (const value of [
    null,
    "",
    "2026-02-29",
    "2026-04-31",
    "2026-13-01",
    "2026-10-00",
    "06/10/2026",
    "2026-10-06T00:00:00Z",
  ]) {
    expect(parseDateInput(value)).toBeUndefined();
  }
});
