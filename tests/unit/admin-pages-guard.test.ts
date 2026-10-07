import assert from "node:assert/strict";
import { globSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "vitest";

/**
 * Every panel page enforces authorization on its own (`requireAdmin`):
 * the layout only requires a session (docs/archive/admin-plan.md §5.3). Pages with no data
 * at all (just a notice) go in the list below.
 */
const ALLOWED_WITHOUT_GUARD = new Set(["app/routes/admin/panel/no-permission.tsx"]);

test("every panel page calls requireAdmin", () => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const pages = globSync("app/routes/admin/panel/*.tsx", { cwd: root }).map((file) =>
    file.replaceAll("\\", "/"),
  );
  assert.ok(pages.length >= 4, `found ${pages.length} pages`);
  for (const page of pages) {
    if (ALLOWED_WITHOUT_GUARD.has(page) || page.endsWith("/layout.tsx")) continue;
    const source = readFileSync(`${root}${page}`, "utf8");
    assert.match(source, /await requireAdmin\(/, `${page} must call requireAdmin`);
  }
});

test("every panel export checks session and permission", () => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const routes = globSync("features/admin/*/server/csv-export.server.ts", { cwd: root });
  assert.ok(routes.length >= 4, `found ${routes.length} exports`);
  // The shared factory authorizes and records the export before streaming.
  const factory = readFileSync(
    `${root}features/admin/shell/server/csv-export-route.server.ts`,
    "utf8",
  );
  assert.match(factory, /await requireAdminApi\(spec\.permission\)/);
  assert.match(factory, /await recordAudit\(/);
  for (const route of routes) {
    const source = readFileSync(`${root}${route}`, "utf8");
    const viaFactory = /csvExportRoute\(\{\s*permission: \{/.test(source);
    const direct = /await requireAdminApi\(\{/.test(source) && /recordAudit\(/.test(source);
    assert.ok(viaFactory || direct, `${route} must check permission and record the export`);
  }
});
