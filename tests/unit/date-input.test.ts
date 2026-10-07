import { expect, test } from "vitest";
import { formatDateInput, parseDateInput } from "@/lib/date-input";

test("the filter keeps the local day on the round trip, including in leap years", () => {
  for (const value of ["2026-10-06", "2024-02-29", "2026-01-01", "2026-12-31"]) {
    const date = parseDateInput(value)!;
    const [year, month, day] = value.split("-").map(Number);
    expect([date.getFullYear(), date.getMonth() + 1, date.getDate()]).toEqual([year, month, day]);
    expect(date.getHours()).toBe(0);
    expect(formatDateInput(date)).toBe(value);
  }
});

test("invalid dates from the URL are not normalized to another day", () => {
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
