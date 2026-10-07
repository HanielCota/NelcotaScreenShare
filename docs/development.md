# Development

Everything you need to run, test and maintain the code. The folder layout is in the [architecture guide](README.md) and the decisions in [`adr/`](adr/).

## Running locally

Prerequisites: Node 26.9+, pnpm 12.9.1 (`npm install -g pnpm@12.9.1`) and Docker.

```bash
# 1. LiveKit in dev mode (the key must be 32+ characters; the app validates this)
docker run -d --name lk-dev \
  -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
  livekit/livekit-server:v1.13.7 \
  --dev --bind 0.0.0.0 --node-ip 127.0.0.1 \
  --keys "devkey: devsecret-0123456789abcdef0123456789abcdef"

# 2. Local Postgres (same configuration and roles as production)
pnpm db:bootstrap:dev        # docker compose -f docker-compose.dev.yml up -d --wait

# 3. Variables
cp .env.example .env.local
#   LIVEKIT_API_KEY=devkey
#   LIVEKIT_API_SECRET=devsecret-0123456789abcdef0123456789abcdef
#   LIVEKIT_URL=ws://localhost:7880
#   DATABASE_URL=postgres://nelcota_app:app-dev@127.0.0.1:54329/nelcota
#   MIGRATOR_DATABASE_URL=postgres://nelcota_migrator:migrator-dev@127.0.0.1:54329/nelcota
#   TEST_DATABASE_URL=postgres://nelcota:nelcota-dev@127.0.0.1:54329/nelcota_test

# 4. App
pnpm install
pnpm db:migrate     # migrations with the migration user
pnpm db:seed        # optional: sample participants (password dev-password-1234), rooms and audit entries
pnpm dev            # http://localhost:3000
```

Open two tabs (or a private window), join the same room and share your screen.

## Scripts

| Script                                     | What it does                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------ |
| `pnpm dev` / `pnpm build` / `pnpm start`   | Development, production build and local production server                            |
| `pnpm typecheck`                           | `tsc --noEmit` (native TypeScript 7)                                                 |
| `pnpm lint` / `pnpm lint:fix`              | Full Oxlint with type information, and safe fixes                                    |
| `pnpm lint:fast` / `pnpm lint:fast:fix`    | Oxlint syntactic rules, without the type engine                                      |
| `pnpm lint:config`                         | Shows the configuration actually loaded by Oxlint                                    |
| `pnpm format`                              | Oxfmt (`.oxfmtrc.json`)                                                              |
| `pnpm format:check`                        | Checks the project's formatting without changing files                               |
| `pnpm test`                                | Vitest: unit + integration (the latter only with `TEST_DATABASE_URL`)                |
| `pnpm test:unit` / `pnpm test:integration` | Only one of the Vitest projects                                                      |
| `pnpm test:watch` / `pnpm test:coverage`   | Watch mode / coverage (`coverage/`, with a ratcheted minimum)                        |
| `pnpm test:e2e`                            | Playwright: room, panel and account flows (dev Postgres and LiveKit running)         |
| `pnpm knip`                                | Unused files, exports and dependencies                                               |
| `pnpm dup`                                 | Code duplication (jscpd, threshold in `.jscpd.json`)                                 |
| `pnpm db:bootstrap:dev`                    | Starts the local Postgres (`docker-compose.dev.yml`) with the roles                  |
| `pnpm db:generate`                         | Generates the SQL migration in `drizzle/` from `server/db/schema/`                   |
| `pnpm db:migrate`                          | Applies the migrations with `MIGRATOR_DATABASE_URL`                                  |
| `pnpm db:studio`                           | Opens Drizzle Studio                                                                 |
| `pnpm db:seed`                             | Sample data (local database only). `--perfil=carga --linhas=300000` for load testing |
| `pnpm build:migrate`                       | Bundles the migrator into `dist/migrate.mjs` (used in the Docker image)              |
| `pnpm build:scripts`                       | Migrator, `create-owner.mjs` (runs in the image) and seed                            |

## Environment variables

| Variable                     | Required   | Description                                                                                |
| ---------------------------- | ---------- | ------------------------------------------------------------------------------------------ |
| `LIVEKIT_API_KEY`            | yes        | LiveKit API key (same as the LiveKit server)                                               |
| `LIVEKIT_API_SECRET`         | yes        | Secret (32+ characters). **Never** sent to the browser                                     |
| `LIVEKIT_URL`                | yes        | `wss://lk.yourdomain.com`                                                                  |
| `ACCESS_PASSWORD`            | no         | If set, everyone needs it to join (constant-time comparison)                               |
| `MAX_PARTICIPANTS`           | no         | Per-room limit, from 2 to 8 (default 6)                                                    |
| `REQUIRE_EMAIL_VERIFICATION` | no         | `true` requires confirming the e-mail before joining rooms (default `false`, off for now)  |
| `DATABASE_URL`               | yes        | Postgres (`postgres://…`), `nelcota_app` role                                              |
| `AUTH_SECRET`                | yes        | Secret for participant accounts (32+ characters)                                           |
| `ADMIN_AUTH_SECRET`          | no         | Enables `/admin` (32+ characters, `openssl rand -base64 48`). Requires the database        |
| `APP_URL`                    | production | Public origin of the app (e-mail links; required with the panel enabled)                   |
| `SMTP_URL` / `MAIL_FROM`     | production | Transactional e-mail (invitations, password). In dev, without SMTP, e-mail goes to the log |
| `SENTRY_DSN`                 | no         | Enables Sentry on the server (no personal data)                                            |
| `PUBLIC_SENTRY_DSN`          | no         | Enables browser error capture; loaded at runtime, no rebuild needed                        |
| `LOG_LEVEL`                  | no         | Log level (default `info` in production, `debug` in dev)                                   |
| `APP_VERSION`                | no         | Set by the image (commit SHA); shown in `/api/ready` and in Sentry                         |

Everything is validated with Zod in `server/env.server.ts`. If something is missing, the container exits with code 1 at boot and lists the problem in the logs.

`LIVEKIT_URL` is read at runtime by the server and returned to the browser along with the token. So changing the URL doesn't require a rebuild, and no variable needs to exist at build time.

## Tests

- `tests/unit`: no database (pure domain: token decision, mascot rules, room protocol…).
- `tests/integration`: real Postgres. With `TEST_DATABASE_URL` (a **disposable** database; in dev it is read from `.env.local`), Vitest recreates an already-migrated template database and each test file gets a clean copy (`CREATE DATABASE … TEMPLATE`). Without the variable, it warns that only the unit tests will run. One of the tests runs as `nelcota_app` to check the grants.
- `tests/e2e`: Playwright with dev Postgres and LiveKit running. It starts the app on `127.0.0.1:3100` with its own database (`nelcota_e2e`, recreated on every run) and Chromium with a fake microphone and screen. If the port is taken, set `E2E_PORT` in the environment before running the tests. Install the browser once with `pnpm exec playwright install chromium`.

## Formatting in AI tasks

`AGENTS.md` requires AI agents to run `pnpm format` on the whole project after
any change, including `components/ui`, and to confirm with `pnpm format:check`
before finishing the task. Oxfmt follows `.oxfmtrc.json` and keeps the exclusions for
dependencies, builds and generated metadata. CI also checks formatting.

## Oxlint

`oxlint.config.ts` is the main configuration, compatible with the installed Oxlint 1.87.
It covers `app`, `components` (including `components/ui`), `features`, `lib`, `server`, tests
and configuration files. Build output, dependencies, coverage and temporary captures are left out.

Beyond code quality, the linter **enforces the architecture** (see the
[architecture guide](README.md) and [`adr/`](adr/)):

- `components/` and `lib/` (generic) don't import features, routes or the server;
- each feature's UI doesn't import the server, the database or another feature's UI (only the mascot and the
  share notice are public); the rule is generated per feature from `features/`;
- `features/*/domain` (and `features/admin/*/domain`) are pure TypeScript (no React, router, database or SDK);
- `server/` (infra) only knows the features' `domain/`;
- no file above 300 effective lines, no function with complexity above 15.

The rules check Hooks and effect dependencies, circular and duplicate imports,
accessibility (including `Link`, `Input` and `Label`),
explicit `any` and unused variables. In full mode, they also check unhandled
Promises, unsafe type operations and unnecessary suppression comments.
Warnings make the command fail, including in fast mode. Parameters and variables
that are intentionally unused can start with `_`.

`typecheck` stays separate (`tsc --noEmit`): it doesn't depend on Oxlint's experimental
type-check. `useGSAP` receives dependencies in a configuration object; it is not added
to `additionalHooks`, which expects the signature with a dependency array.

The exceptions are local: the initial focus of the microphone, reactions and
share popovers allows keyboard navigation. In `SignUpForm`, the autocomplete rule
has an exception because the [Oxlint 1.86 implementation](https://github.com/oxc-project/oxc/blob/oxlint_v1.86.0/crates/oxc_linter/src/rules/jsx_a11y/autocomplete_valid.rs)
omits `nickname`, which is [valid in the HTML standard](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-detail-tokens).
This exception should be revisited when Oxlint is updated.

`oxlint.fast.config.mjs` reuses the main configuration and turns off only the type
engine and unused-suppression detection, since suppressions of type-aware rules
cannot be evaluated in that mode. Use `pnpm lint:fast` for quick local feedback;
it doesn't replace `pnpm lint` or `pnpm typecheck`.

If Windows shows "Controle de Aplicativo bloqueou este arquivo" ("Application Control blocked this file") when starting
`tsgolint.exe`, the full lint fails because of an operating-system restriction.
In that environment you can run `pnpm lint:fast` and `pnpm typecheck` separately,
but validating the type-aware rules requires an environment that allows that executable.
[Windows Smart App Control](https://support.microsoft.com/en-us/windows/security/threat-malware-protection/smart-app-control-frequently-asked-questions)
doesn't offer individual exceptions; on managed machines, ask the administrator
responsible for the application policy. For full validation in CI, run `pnpm lint`,
`pnpm typecheck`, `pnpm test` and `pnpm build`.

> In production and locally, `pnpm start` runs React Router's Express adapter (`server.mjs --production`). The Docker image includes only production dependencies, the SSR build, assets and the migration scripts.

## Common problems

| Symptom                                                                           | Cause and fix                                                                                                                          |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Integration tests fail with `ECONNREFUSED 127.0.0.1:54329`                        | The dev Postgres isn't running (happens after restarting Docker). Run `pnpm db:bootstrap:dev`.                                         |
| Room E2E tests fail and the log shows `failed to generate token` (`ECONNREFUSED`) | The dev LiveKit isn't running. Run `docker start lk-dev` (or the `docker run` above, the first time).                                  |
| `http://localhost:3000` opens another app                                         | Another process holds port 3000 on IPv6, and `localhost` resolves to `::1` first. Use `http://127.0.0.1:3000` or `PORT=3001 pnpm dev`. |
| Port 3100 taken when running E2E                                                  | Set `E2E_PORT` in the environment before `pnpm test:e2e`.                                                                              |
