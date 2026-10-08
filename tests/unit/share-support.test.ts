import assert from "node:assert/strict";
import { test } from "vitest";
import { canShare, classifyShareSupport, sharesAudio } from "@/features/room/domain/share-support";

const UA = {
  chrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  edge: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
  firefox: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0",
  safari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
  android:
    "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
  iphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
};

test("desktop: Chromium shares everything; Firefox without audio; Safari warns", () => {
  assert.equal(classifyShareSupport({ userAgent: UA.chrome, hasDisplayMedia: true }), "full");
  assert.equal(classifyShareSupport({ userAgent: UA.edge, hasDisplayMedia: true }), "full");
  assert.equal(
    classifyShareSupport({ userAgent: UA.firefox, hasDisplayMedia: true }),
    "screen-only",
  );
  assert.equal(classifyShareSupport({ userAgent: UA.safari, hasDisplayMedia: true }), "safari");
});

test("phones and tablets do not share, even the iPad that claims to be a Mac", () => {
  assert.equal(classifyShareSupport({ userAgent: UA.android, hasDisplayMedia: false }), "mobile");
  assert.equal(classifyShareSupport({ userAgent: UA.iphone, hasDisplayMedia: false }), "mobile");
  assert.equal(
    classifyShareSupport({ userAgent: UA.safari, hasDisplayMedia: true, maxTouchPoints: 5 }),
    "mobile",
  );
  assert.equal(
    classifyShareSupport({ userAgent: UA.chrome, hasDisplayMedia: true, mobileHint: true }),
    "mobile",
  );
});

test("desktop without the feature", () => {
  assert.equal(
    classifyShareSupport({ userAgent: UA.chrome, hasDisplayMedia: false }),
    "unsupported",
  );
});

test("only desktop browsers share, and only Chromium sends the computer audio", () => {
  assert.equal(canShare("full"), true);
  assert.equal(canShare("screen-only"), true);
  assert.equal(canShare("safari"), true);
  assert.equal(canShare("mobile"), false);
  assert.equal(canShare("unsupported"), false);
  assert.equal(sharesAudio("full"), true);
  assert.equal(sharesAudio("screen-only"), false);
  assert.equal(sharesAudio("safari"), false);
});
