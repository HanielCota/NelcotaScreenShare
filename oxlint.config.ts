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
    // Tamanho e complexidade (docs/refactor/03-arquitetura-alvo.md §4).
    "eslint/max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
    "eslint/complexity": ["error", { max: 15 }],
  },
  overrides: [
    {
      // Camadas (docs/PLANO-ADMIN.md §3.3): UI e código isomórfico não tocam o banco
      // nem o servidor. Dados chegam por props/Server Components; mutações por actions.
      files: [
        "components/**",
        "hooks/**",
        "lib/**",
        "features/*/components/**",
        "features/*/columns.tsx",
      ],
      rules: {
        "eslint/no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["@/server", "@/server/*", "pg", "drizzle-orm", "drizzle-orm/*"],
                allowTypeImports: true,
                message: "Componentes não acessam o servidor/banco: use props ou uma action.",
              },
              {
                group: ["@/features/*/queries"],
                allowTypeImports: true,
                message: "Consultas são server-only: chame-as num Server Component.",
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
      // CATRACA: arquivos que ainda estouram os limites. A lista só diminui:
      // cada fase da refatoração tira daqui o que quebrou em partes menores.
      files: [
        "app/admin/(painel)/salas/[[]id]/page.tsx",
        "app/admin/(painel)/usuarios/[[]id]/page.tsx",
        "app/api/token/route.ts",
        "features/auth/ui/SignUpForm.tsx",
        "components/data-table/DataTable.tsx",
        "components/mascot/avatar-frames.ts",
        "components/mascot/use-mascot.ts",
        "components/room/PreJoin.tsx",
        "components/room/RoomView.tsx",
        "components/room/ScreenStage.tsx",
        "features/admin/participants/ui/ParticipantActions.tsx",
        "server/livekit/webhook-projector.ts",
      ],
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
        "components/room/MicMenu.tsx",
        "components/room/Reactions.tsx",
        "components/room/ShareMenu.tsx",
        "features/auth/ui/TwoFactorSettings.tsx",
        "features/auth/ui/TwoFactorCodeForm.tsx",
      ],
      // Popovers abertos por ação da pessoa e telas de um único campo (código do
      // 2FA, que a pessoa acabou de pedir): o foco inicial ajuda quem usa teclado.
      rules: { "jsx-a11y/no-autofocus": "off" },
    },
  ],
});
