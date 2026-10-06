import { readdirSync } from "node:fs";
import { defineConfig, type OxlintOverride } from "oxlint";

/** Uma regra de UI por feature: dentro dela os imports são livres. */
const FEATURES = readdirSync("features", { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

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
    // Tamanho e complexidade (docs/refactor/03-arquitetura-alvo.md §4).
    "eslint/max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
    "eslint/complexity": ["error", { max: 15 }],
  },
  overrides: [
    // Camadas (docs/refactor/03-arquitetura-alvo.md §2). Cada override diz o que
    // a pasta NÃO pode importar; o resto é livre (sem ciclos, pelo import/no-cycle).
    {
      // Genérico (UI compartilhada e utilitários): não conhece features, rotas nem servidor.
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
                group: ["@/server", "@/server/*", "pg", "drizzle-orm", "drizzle-orm/*"],
                allowTypeImports: true,
                message: "Código genérico não acessa o servidor nem o banco.",
              },
            ],
          },
        ],
      },
    },
    // UI e hooks das features: dados por props/RSC, mutações por actions; da UI de
    // outra feature, só o que é público (mascote e aviso de compartilhamento).
    ...FEATURES.map((feature): OxlintOverride => ({
      files: [
        `features/${feature}/ui/**`,
        `features/${feature}/hooks/**`,
        `features/${feature}/client/**`,
        `features/${feature}/*/ui/**`,
      ],
      rules: {
        "eslint/no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: [
                  "@/server",
                  "@/server/*",
                  "@/features/*/server/*",
                  "@/features/admin/*/queries",
                  "pg",
                  "drizzle-orm",
                  "drizzle-orm/*",
                  "livekit-server-sdk",
                ],
                allowTypeImports: true,
                message: "UI não acessa o servidor: use props, um Server Component ou uma action.",
              },
              {
                group: [
                  "@/features/*/ui/**",
                  "@/features/*/*/ui/**",
                  `!@/features/${feature}/**`,
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
      // Domínio: TypeScript puro (testável sem React, Next, banco ou SDK).
      files: ["features/*/domain/**", "features/mascot/engine/**"],
      rules: {
        "eslint/no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: [
                  "react",
                  "react-dom",
                  "next",
                  "next/*",
                  "pg",
                  "drizzle-orm",
                  "drizzle-orm/*",
                  "livekit-client",
                  "livekit-server-sdk",
                  "better-auth",
                  "better-auth/*",
                  "@/server",
                  "@/server/*",
                  "@/features/*/server/*",
                  "@/features/*/ui/*",
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
      // Infra do servidor: só o domínio das features (constantes e tipos puros).
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
                  "@/features/*/server/*",
                  "@/features/*/ui/*",
                  "@/features/*/hooks/*",
                  "@/features/*/client/*",
                  "@/features/*/actions",
                ],
                message: "Infra não conhece features (exceto o domain/, que é puro).",
              },
            ],
          },
        ],
      },
    },
    {
      // Vendor (shadcn) e testes ficam fora dos limites de tamanho.
      files: ["components/ui/**", "tests/**"],
      rules: { "eslint/max-lines": "off", "eslint/complexity": "off" },
    },
    {
      // Fixtures de teste montam objetos parciais (DOM, respostas HTTP, contexto do
      // Better Auth) de propósito; no código do app a regra continua valendo.
      files: ["tests/**"],
      rules: { "typescript/no-unsafe-type-assertion": "off" },
    },
    {
      files: ["features/auth/ui/SignUpForm.tsx"],
      // Oxlint 1.86 omite o token HTML válido `nickname` da lista desta regra.
      // https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field
      rules: { "jsx-a11y/autocomplete-valid": "off" },
    },
    {
      files: [
        "features/room/ui/dock/MicMenu.tsx",
        "features/room/ui/dock/Reactions.tsx",
        "features/room/ui/dock/ShareMenu.tsx",
        "features/auth/ui/TwoFactorSettings.tsx",
        "features/auth/ui/TwoFactorCodeForm.tsx",
      ],
      // Popovers abertos por ação da pessoa e telas de um único campo (código do
      // 2FA, que a pessoa acabou de pedir): o foco inicial ajuda quem usa teclado.
      rules: { "jsx-a11y/no-autofocus": "off" },
    },
  ],
});
