import assert from "node:assert/strict";
import { globSync } from "node:fs";
import { relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, test, vi } from "vitest";
import { z } from "zod";

/**
 * Every protected operation in the app must reject anyone who is not signed in (docs/archive/admin-plan.md §5.3).
 * This test imports ALL `actions.server.ts` files and calls each operation without a session: it must
 * reject before validating or running anything. Intentionally public actions
 * go in the list below. A new operation created outside `defineAdminOperation`/`defineUserOperation`
 * breaks this test.
 */
const PUBLIC_ACTIONS = new Set(["features/auth/actions.server.ts#acceptInvitation"]);

const anonymous = new Headers({ "x-client-ip": "203.0.113.200", "user-agent": "vitest" });
vi.mock("@/server/request-context.server", () => ({
  requestMemo: (load: () => unknown) => load,
  requestHeaders: () => anonymous,
}));
const root = fileURLToPath(new URL("../../", import.meta.url));
// Actions live in features (and, if there ever are any, in app/); both folders are included.
const files = globSync(["app/**/actions.server.ts", "features/**/actions.server.ts"], {
  cwd: root,
}).map((file) => file.replaceAll("\\", "/"));
const actionResult = z.object({ serverError: z.string().optional() }).loose();

describe("all operations reject anyone who is not signed in", () => {
  test("there are actions to check", () => {
    assert.ok(files.length >= 4, `found ${files.length} actions files`);
  });

  for (const file of files) {
    test(file, async () => {
      const mod: unknown = await import(pathToFileURL(`${root}${file}`).href);
      const actions = Object.entries(z.record(z.string(), z.unknown()).parse(mod)).filter(
        (entry): entry is [string, (input: unknown) => Promise<unknown>] =>
          typeof entry[1] === "function",
      );
      assert.ok(actions.length > 0, `${file} exports no actions`);
      for (const [name, action] of actions) {
        const id = `${relative(root, `${root}${file}`).replaceAll("\\", "/")}#${name}`;
        if (PUBLIC_ACTIONS.has(id)) continue;
        const result = actionResult.parse(await action({}));
        assert.equal(
          result.serverError,
          "Sua sessão expirou. Entre de novo.",
          `${id} should reject without a session (got ${JSON.stringify(result).slice(0, 200)})`,
        );
      }
    });
  }
});
