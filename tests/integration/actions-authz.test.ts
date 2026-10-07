import assert from "node:assert/strict";
import { globSync } from "node:fs";
import { relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, test, vi } from "vitest";
import { z } from "zod";

/**
 * Toda operação protegida do app precisa recusar quem não está logado (docs/archive/admin-plan.md §5.3).
 * Este teste importa TODOS os `actions.ts` e chama cada action sem sessão: ela tem de
 * recusar antes de validar ou executar qualquer coisa. Actions públicas de propósito
 * ficam na lista abaixo. Uma action nova criada fora do `adminAction`/`userAction`
 * quebra este teste.
 */
const PUBLIC_ACTIONS = new Set(["features/auth/actions.server.ts#acceptInvitation"]);

const anonymous = new Headers({ "x-client-ip": "203.0.113.200", "user-agent": "vitest" });
vi.mock("@/server/request-context.server", () => ({
  requestMemo: (load: () => unknown) => load,
  requestHeaders: () => anonymous,
}));
const root = fileURLToPath(new URL("../../", import.meta.url));
// Actions ficam nas features (e, se um dia houver, em app/); as duas pastas entram.
const files = globSync(["app/**/actions.server.ts", "features/**/actions.server.ts"], {
  cwd: root,
}).map((file) => file.replaceAll("\\", "/"));
const actionResult = z.object({ serverError: z.string().optional() }).loose();

describe("todas as Server Actions recusam quem não está logado", () => {
  test("há actions para conferir", () => {
    assert.ok(files.length >= 4, `encontrou ${files.length} arquivos de actions`);
  });

  for (const file of files) {
    test(file, async () => {
      const mod: unknown = await import(pathToFileURL(`${root}${file}`).href);
      const actions = Object.entries(z.record(z.string(), z.unknown()).parse(mod)).filter(
        (entry): entry is [string, (input: unknown) => Promise<unknown>] =>
          typeof entry[1] === "function",
      );
      assert.ok(actions.length > 0, `${file} não exporta actions`);
      for (const [name, action] of actions) {
        const id = `${relative(root, `${root}${file}`).replaceAll("\\", "/")}#${name}`;
        if (PUBLIC_ACTIONS.has(id)) continue;
        const result = actionResult.parse(await action({}));
        assert.equal(
          result.serverError,
          "Sua sessão expirou. Entre de novo.",
          `${id} deveria recusar sem sessão (veio ${JSON.stringify(result).slice(0, 200)})`,
        );
      }
    });
  }
});
