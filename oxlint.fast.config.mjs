import { defineConfig } from "oxlint";
import config from "./oxlint.config.ts";

/** Mesmas regras sintáticas; não substitui o lint completo nem o typecheck. */
export default defineConfig({
  ...config,
  options: {
    ...config.options,
    typeAware: false,
    typeCheck: false,
    // Sem o motor de tipos, supressões de regras type-aware pareceriam inutilizadas.
    reportUnusedDisableDirectives: "off",
  },
});
