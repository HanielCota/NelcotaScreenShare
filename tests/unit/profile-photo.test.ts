import { expect, test } from "vitest";
import { isPlainWebp } from "@/features/account/domain/profile-photo";

function chunk(name: string, size: number): Uint8Array {
  const bytes = new Uint8Array(8 + size + (size % 2));
  bytes.set(new TextEncoder().encode(name), 0);
  new DataView(bytes.buffer).setUint32(4, size, true);
  return bytes;
}

/** Minimal ICC profile header: declared size and the `acsp` signature. */
function iccp(size = 480): Uint8Array {
  const bytes = chunk("ICCP", size);
  new DataView(bytes.buffer).setUint32(8, size, false);
  bytes.set(new TextEncoder().encode("acsp"), 8 + 36);
  return bytes;
}

function webp(...chunks: Uint8Array[]): Uint8Array {
  const body = chunks.reduce((total, part) => total + part.length, 0);
  const bytes = new Uint8Array(12 + body);
  bytes.set(new TextEncoder().encode("RIFF"), 0);
  new DataView(bytes.buffer).setUint32(4, 4 + body, true);
  bytes.set(new TextEncoder().encode("WEBP"), 8);
  let offset = 12;
  for (const part of chunks) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}

test("accepts the still images the editor produces", () => {
  expect(isPlainWebp(webp(chunk("VP8 ", 31)))).toBe(true);
  expect(isPlainWebp(webp(chunk("VP8L", 20)))).toBe(true);
  expect(isPlainWebp(webp(chunk("VP8X", 10), chunk("ALPH", 7), chunk("VP8 ", 30)))).toBe(true);
  // What Chrome exports: the canvas color profile comes along.
  expect(isPlainWebp(webp(chunk("VP8X", 10), iccp(), chunk("ALPH", 7), chunk("VP8 ", 30)))).toBe(
    true,
  );
});

test("refuses metadata, animation and unknown chunks", () => {
  for (const extra of ["EXIF", "XMP ", "ANIM", "ANMF", "ZZZZ"]) {
    expect(isPlainWebp(webp(chunk("VP8X", 10), chunk(extra, 12), chunk("VP8 ", 30)))).toBe(false);
  }
});

test("refuses a color profile chunk that is not an ICC profile", () => {
  expect(isPlainWebp(webp(chunk("VP8X", 10), chunk("ICCP", 480), chunk("VP8 ", 30)))).toBe(false);
  const shortDeclared = iccp();
  new DataView(shortDeclared.buffer).setUint32(8, 100, false);
  expect(isPlainWebp(webp(chunk("VP8X", 10), shortDeclared, chunk("VP8 ", 30)))).toBe(false);
});

test("refuses broken structures and smuggled bytes", () => {
  const valid = webp(chunk("VP8 ", 30));
  expect(isPlainWebp(new Uint8Array([...valid, 1, 2, 3, 4]))).toBe(false);
  const wrongSize = valid.slice();
  new DataView(wrongSize.buffer).setUint32(4, 999, true);
  expect(isPlainWebp(wrongSize)).toBe(false);
  const overflow = valid.slice();
  new DataView(overflow.buffer).setUint32(16, 9999, true);
  expect(isPlainWebp(overflow)).toBe(false);
  expect(isPlainWebp(webp(chunk("VP8X", 10)))).toBe(false);
  expect(isPlainWebp(new TextEncoder().encode("RIFF\0\0\0\0WEBP"))).toBe(false);
});
