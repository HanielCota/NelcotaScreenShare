import { readdirSync } from "node:fs";
import { defineConfig, type OxlintOverride } from "oxlint";

/** One UI rule per feature: imports inside it are free. */
const FEATURES = readdirSync("features", { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

export default defineConfig({
  $schema: "./node_modules/oxlint/configuration_schema.json",
  plugins: ["typescript", "react", "import", "jsx-a11y", "oxc", "unicorn"],
  options: {
    typeAware: true,
    // The official compiler runs in `pnpm typecheck`; avoids duplicating the experimental type-check.
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
    ".react-router/**",
    "node_modules/**",
    "dist/**",
    "build/**",
    "coverage/**",
    "output/**",
    ".playwright-cli/**",
    "test-results/**",
    "playwright-report/**",
  ],
  settings: {
    "jsx-a11y": {
      components: { Link: "a", Input: "input", Label: "label" },
      attributes: { href: ["href", "to"] },
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
    "import/no-unassigned-import": ["error", { allow: ["**/*.css"] }],
    // Redundant with TypeScript; conflicts with the "optional cleanup" pattern of effects.
    "typescript/consistent-return": "off",
    "jsx-a11y/no-autofocus": "error",

    // Size and complexity (docs/archive/refactor/03-target-architecture.md §4).
    "eslint/max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
    "eslint/complexity": ["error", { max: 15 }],
  },
  overrides: [
    // Layers (docs/archive/refactor/03-target-architecture.md §2). Each override says what
    // the folder must NOT import; the rest is free (no cycles, via import/no-cycle).
    {
      // Generic (shared UI and utilities): knows nothing about features, routes or the server.
      files: ["components/**", "lib/**"],
      rules: {
        "eslint/no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["@/features/*", "@/features/**", "@/app/*", "@/app/**"],
                allowTypeImports: true,
                message: "Código genérico não depende de features nem de rotas.",
              },
              {
                group: ["@/server", "@/server/**", "pg", "drizzle-orm", "drizzle-orm/*"],
                allowTypeImports: true,
                message: "Código genérico não acessa o servidor nem o banco.",
              },
            ],
          },
        ],
      },
    },
    // Feature UI and hooks: data via props/loaders, mutations via actions; from another
    // feature's UI, only what is public (mascot and screen share notice).
    ...FEATURES.map((feature): OxlintOverride => ({
      files: [
        `features/${feature}/ui/**`,
        `features/${feature}/hooks/**`,
        `features/${feature}/client/**`,
        `features/${feature}/*/ui/**`,
        `features/${feature}/*/hooks/**`,
        `features/${feature}/*/client/**`,
      ],
      rules: {
        "eslint/no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: [
                  "@/server",
                  "@/server/**",
                  "@/features/**/server/**",
                  "pg",
                  "drizzle-orm",
                  "drizzle-orm/*",
                  "livekit-server-sdk",
                ],
                allowTypeImports: true,
                message: "UI não acessa o servidor: use props, loaders ou actions de rota.",
              },
              {
                group: [
                  "@/features/*/ui/**",
                  "@/features/*/*/ui/**",
                  `!@/features/${feature}/ui/**`,
                  `!@/features/${feature}/*/ui/**`,
                  "!@/features/mascot/ui/*",
                  "!@/features/room/ui/ShareSupportNote",
                ],
                allowTypeImports: true,
                message:
                  "UI de outra feature não é pública (só o mascote e o aviso de compartilhamento).",
              },
            ],
          },
        ],
      },
    })),
    {
      // Domain: plain TypeScript (testable without React, router, database or SDK).
      files: ["features/*/domain/**", "features/*/*/domain/**"],
      rules: {
        "eslint/no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: [
                  "react",
                  "react-dom",
                  "react-router",
                  "react-router/*",
                  "pg",
                  "drizzle-orm",
                  "drizzle-orm/*",
                  "livekit-client",
                  "livekit-server-sdk",
                  "better-auth",
                  "better-auth/*",
                  "@/server",
                  "@/server/**",
                  "@/features/**/server/**",
                  "@/features/**/ui/**",
                ],
                allowTypeImports: true,
                message: "domain/ é TypeScript puro: dependências entram por parâmetro.",
              },
            ],
          },
        ],
      },
    },
    {
      // Server infra: only the features' domain (constants and pure types).
      files: ["server/**"],
      rules: {
        "eslint/no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: [
                  "@/app/*",
                  "@/app/**",
                  "@/components/*",
                  "@/features/**/server/**",
                  "@/features/**/ui/**",
                  "@/features/**/hooks/**",
                  "@/features/**/client/**",
                  "@/features/**/actions",
                ],
                message: "Infra não conhece features (exceto o domain/, que é puro).",
              },
            ],
          },
        ],
      },
    },
    {
      // Vendor (shadcn) and tests are exempt from the size limits.
      files: ["components/ui/**", "tests/**"],
      rules: { "eslint/max-lines": "off", "eslint/complexity": "off" },
    },
    {
      // Test fixtures build partial objects (DOM, HTTP responses, Better Auth
      // context) on purpose; in app code the rule still applies.
      files: ["tests/**"],
      rules: { "typescript/no-unsafe-type-assertion": "off" },
    },
    {
      files: ["features/auth/ui/SignUpForm.tsx"],
      // Oxlint 1.86 leaves the valid HTML token `nickname` out of this rule's list.
      // https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field
      rules: { "jsx-a11y/autocomplete-valid": "off" },
    },
    {
      files: [
        "features/room/ui/dock/MicMenu.tsx",
        "features/room/ui/dock/Reactions.tsx",
        "features/room/ui/dock/ShareMenu.tsx",
        "features/security/ui/TwoFactorSettings.tsx",
        "features/auth/ui/TwoFactorCodeForm.tsx",
      ],
      // Popovers opened by the user's action and single-field screens (the 2FA
      // code the user just requested): initial focus helps keyboard users.
      rules: { "jsx-a11y/no-autofocus": "off" },
    },
  ],
});
