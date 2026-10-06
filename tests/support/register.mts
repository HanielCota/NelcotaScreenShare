import { statSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * Resolve imports como o Next faz, para o runner nativo do Node:
 * `@/x` aponta para a raiz do projeto e imports sem extensão ganham `.ts`/`.tsx`.
 * Rode com `--conditions=react-server` para que `server-only` vire um módulo vazio.
 */
const root = new URL("../../", import.meta.url);

function withExtension(url: URL): string | undefined {
  const path = fileURLToPath(url);
  for (const candidate of [path, `${path}.ts`, `${path}.tsx`, `${path}/index.ts`]) {
    if (statSync(candidate, { throwIfNoEntry: false })?.isFile()) {
      return pathToFileURL(candidate).href;
    }
  }
  return undefined;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const resolved = withExtension(new URL(specifier.slice(2), root));
      if (resolved) return nextResolve(resolved, context);
    }
    if (
      specifier.startsWith(".") &&
      context.parentURL?.startsWith(root.href) &&
      !context.parentURL.includes("/node_modules/")
    ) {
      const resolved = withExtension(new URL(specifier, context.parentURL));
      if (resolved) return nextResolve(resolved, context);
    }
    // O pacote `next` não declara "exports": no ESM do Node, `next/server` precisa do `.js`.
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    return nextResolve(specifier, context);
  },
});
