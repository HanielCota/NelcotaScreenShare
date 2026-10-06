import assert from "node:assert/strict";
import { test } from "vitest";
import { CSV_BOM, csvCell, csvRow } from "@/lib/csv";

test("CSV injection: fórmulas viram texto", () => {
  for (const evil of ['=HYPERLINK("x")', "+1+1", "-2+3", "@SUM(A1)", "\tcmd", "\rcmd"]) {
    assert.ok(csvCell(evil).replace(/^"/, "").startsWith("'"), evil);
  }
  assert.equal(csvCell("normal"), "normal");
  assert.equal(csvCell(-5), "'-5", "número negativo também (o Excel avaliaria)");
});

test("separador, aspas, quebras e tipos", () => {
  assert.equal(csvCell('a;b"c'), '"a;b""c"');
  assert.equal(csvCell("linha\nnova"), '"linha\nnova"');
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(new Date("2026-10-06T12:00:00Z")), "2026-10-06T12:00:00.000Z");
  // JSON tem aspas: sai entre aspas, com as internas dobradas.
  assert.equal(csvCell({ a: 1 }), '"{""a"":1}"');
  assert.equal(csvRow(["a", 1, null]), "a;1;\r\n");
  assert.equal(CSV_BOM.charCodeAt(0), 0xfeff);
});
