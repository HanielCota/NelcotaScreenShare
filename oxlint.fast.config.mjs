import { defineConfig } from "oxlint";
import config from "./oxlint.config.ts";

/** Same syntactic rules; does not replace the full lint or the typecheck. */
export default defineConfig({
  ...config,
  options: {
    ...config.options,
    typeAware: false,
    typeCheck: false,
    // Without the type engine, suppressions of type-aware rules would look unused.
    reportUnusedDisableDirectives: "off",
  },
});
