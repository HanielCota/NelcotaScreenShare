import { defineConfig } from "oxlint";

export default defineConfig({
  $schema: "./node_modules/oxlint/configuration_schema.json",
  plugins: ["typescript", "react", "nextjs", "import", "jsx-a11y", "oxc", "unicorn"],
  options: {
    typeAware: true,
    typeCheck: true,
    reportUnusedDisableDirectives: "error",
    denyWarnings: true,
  },
  categories: {
    correctness: "error",
    suspicious: "warn",
  },
  env: {
    browser: true,
    node: true,
    es2024: true,
  },
  ignorePatterns: [".next/**", "node_modules/**", "components/ui/**", "next-env.d.ts"],
  rules: {
    "typescript/no-floating-promises": "error",
    "typescript/no-misused-promises": "error",
    "typescript/await-thenable": "error",
    "typescript/no-explicit-any": "error",
    "typescript/no-unsafe-assignment": "error",
    "typescript/no-unsafe-call": "error",
    "typescript/no-unsafe-member-access": "error",
    "typescript/no-unsafe-return": "error",
    "typescript/consistent-type-imports": "error",
    "react/rules-of-hooks": "error",
    "react/exhaustive-deps": "warn",
    "react/react-in-jsx-scope": "off",
    "import/no-cycle": "error",
    "import/no-unassigned-import": ["error", { allow: ["server-only", "**/*.css"] }],
    // Redundante com o TypeScript; conflita com o padrão "cleanup opcional" dos effects.
    "typescript/consistent-return": "off",
    "jsx-a11y/no-autofocus": "off",
    "nextjs/no-img-element": "error",
  },
});
