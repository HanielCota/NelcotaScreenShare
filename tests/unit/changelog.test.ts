import assert from "node:assert/strict";
import { test } from "vitest";
import { formatReleaseDate, RELEASES } from "@/features/home/domain/changelog";

test("releases are listed newest first, one per day, each with changes", () => {
  const dates = RELEASES.map((release) => release.date);
  assert.deepEqual(dates, dates.toSorted().toReversed());
  assert.equal(new Set(dates).size, dates.length);
  for (const release of RELEASES) {
    assert.match(release.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(release.changes.length > 0, release.date);
  }
});

test("a release date reads as the same calendar day in any time zone", () => {
  assert.equal(formatReleaseDate("2026-10-08"), "8 de outubro de 2026");
});
