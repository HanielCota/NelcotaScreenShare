import assert from "node:assert/strict";
import { test } from "vitest";
import { BROWSER_ROWS, visitorRow } from "@/features/home/domain/browser-matrix";
import { canShare, sharesAudio, type ShareSupport } from "@/features/room/domain/share-support";

test("the visitor's browser maps to the row that describes it", () => {
  assert.equal(visitorRow("full"), "chromium");
  assert.equal(visitorRow("screen-only"), "firefox");
  assert.equal(visitorRow("safari"), "safari");
  assert.equal(visitorRow("mobile"), "mobile");
});

test("no row is highlighted before hydration or for an unsupported browser", () => {
  assert.equal(visitorRow(null), null);
  assert.equal(visitorRow("unsupported"), null);
});

test("each row promises exactly what the room allows for that browser", () => {
  const supports: ShareSupport[] = ["full", "screen-only", "safari", "mobile"];
  for (const support of supports) {
    const row = BROWSER_ROWS.find(({ id }) => id === visitorRow(support));
    assert.ok(row, support);
    assert.equal(row.screen, canShare(support), support);
    assert.equal(row.audio, sharesAudio(support), support);
  }
});
