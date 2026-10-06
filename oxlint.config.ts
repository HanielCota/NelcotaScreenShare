import { defineConfig } from "oxlint";

export default defineConfig({
  $schema: "./node_modules/oxlint/configuration_schema.json",
  plugins: ["typescript", "react", "nextjs", "import", "jsx-a11y", "oxc", "unicorn"],
  options: {
    typeAware: true,
    // O compilador oficial fica em `pnpm typecheck`; evita duplicar o type-check experimental.
    typeCheck: false,
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
  ignorePatterns: [
    ".next/**",
    "node_modules/**",
    "out/**",
    "build/**",
    "coverage/**",
    "output/**",
    ".playwright-cli/**",
    "next-env.d.ts",
  ],
  settings: {
    next: { rootDir: "." },
    "jsx-a11y": {
      components: { Link: "a", Image: "img", Input: "input", Label: "label" },
    },
  },
  rules: {
    "eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
    ],
    "eslint/no-debugger": "error",
    "typescript/no-floating-promises": "error",
    "typescript/no-misused-promises": "error",
    "typescript/await-thenable": "error",
    "typescript/no-explicit-any": "error",
    "typescript/no-unsafe-assignment": "error",
    "typescript/no-unsafe-call": "error",
    "typescript/no-unsafe-member-access": "error",
    "typescript/no-unsafe-return": "error",
    "typescript/no-unsafe-argument": "error",
    "typescript/no-unsafe-type-assertion": "error",
    "typescript/consistent-type-imports": "error",
    "react/rules-of-hooks": "error",
    "react/exhaustive-deps": "error",
    "react/react-in-jsx-scope": "off",
    "import/no-cycle": ["error", { ignoreExternal: true }],
    "import/no-duplicates": "error",
    "import/no-unassigned-import": ["error", { allow: ["server-only", "**/*.css"] }],
    // Redundante com o TypeScript; conflita com o padrão "cleanup opcional" dos effects.
    "typescript/consistent-return": "off",
    "jsx-a11y/no-autofocus": "error",
    "nextjs/no-img-element": "error",
    "nextjs/no-async-client-component": "error",
  },
  overrides: [
    {
      files: ["components/room/PreJoin.tsx"],
      // Oxlint 1.86 omite o token HTML válido `nickname` da lista desta regra.
      // https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field
      rules: { "jsx-a11y/autocomplete-valid": "off" },
    },
    {
      files: [
        "components/room/MicMenu.tsx",
        "components/room/Reactions.tsx",
        "components/room/ShareMenu.tsx",
      ],
      // Popovers abertos por ação da pessoa: foco inicial permite navegar pelo teclado.
      rules: { "jsx-a11y/no-autofocus": "off" },
    },
  ],
});
