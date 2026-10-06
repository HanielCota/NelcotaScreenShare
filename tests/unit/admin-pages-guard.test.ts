import assert from "node:assert/strict";
import { globSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "vitest";

/**
 * Toda página do painel aplica a autorização por conta própria (`requireAdmin`):
 * o layout só exige sessão (docs/PLANO-ADMIN.md §5.3). Páginas sem dado nenhum
 * (só um aviso) ficam na lista abaixo.
 */
const ALLOWED_WITHOUT_GUARD = new Set(["app/admin/(painel)/sem-permissao/page.tsx"]);

test("toda página do painel chama requireAdmin", () => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const pages = globSync("app/admin/(painel)/**/page.tsx", { cwd: root }).map((file) =>
    file.replaceAll("\\", "/"),
  );
  assert.ok(pages.length >= 4, `encontrou ${pages.length} páginas`);
  for (const page of pages) {
    if (ALLOWED_WITHOUT_GUARD.has(page)) continue;
    const source = readFileSync(`${root}${page}`, "utf8");
    assert.match(source, /await requireAdmin\(/, `${page} precisa chamar requireAdmin`);
  }
});

test("toda exportação do painel confere sessão e permissão", () => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const routes = globSync("app/api/admin/exportar/**/route.ts", { cwd: root });
  assert.ok(routes.length >= 4, `encontrou ${routes.length} exportações`);
  for (const route of routes) {
    const source = readFileSync(`${root}${route}`, "utf8");
    assert.match(source, /await requireAdminApi\(\{/, `${route} precisa chamar requireAdminApi`);
    assert.match(source, /recordAudit\(/, `${route} precisa registrar a exportação`);
  }
});
