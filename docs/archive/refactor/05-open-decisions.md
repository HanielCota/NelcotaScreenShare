# 05 — Open decisions and assumptions

> **Update (execution, 2026-10-06):** the refactoring followed the assumptions below. Q2 was resolved by committing the WIP as it was (`07e1259`), Q4 with the mandatory database (Phase 1) and Q5 by keeping `user.export`. Q1 and Q3 are still up to you. See [06-execution.md](06-execution.md).

None of this blocked the analysis. Where I had to decide, I took the assumption marked below, and the proposal works with it. If any of them is wrong, docs 03 and 04 change at the indicated point.

## Questions (to answer before Phase 0)

| #   | Question                                                                                                                                    | Assumption taken                                                                                                                                                       | What it changes                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Q1  | Is the repository going to GitHub (there are `ci.yml`, `deploy.yml` and `renovate.json`, but **no `git remote`**)? Public or private?       | It goes to GitHub, **private**                                                                                                                                         | Without a remote, Phase 0 needs another CI. If public, S-06 (fork `workflow_run`) becomes high priority                                    |
| Q2  | Will the mascot WIP (`MascotPair`, `personality.ts`, +189 lines in `use-mascot.ts`) be committed as is, finished first or discarded?        | It will be finished and committed **before** Phase 0                                                                                                                   | If it continues in parallel, subphase 3g conflicts with it; in that case, 3g waits                                                         |
| Q3  | Is there any external contract besides the app URLs? (Any consumer of `/api/*`, links saved by users, an integration reading `audit_logs`?) | None. Contracts = page URLs, `?convite`/`?voltar`/panel filters, `/api/token` (used only by the app itself), the LiveKit webhook and the values stored in the database | If there is a consumer of `/api/admin/exportar/*` or of `audit_logs`, the CSV columns and the `action` are frozen (already the assumption) |
| Q4  | Is "app without a database" a supported mode? (`db/index.ts:18` says yes; `env.ts:41` says `DATABASE_URL` is required.)                     | **Not supported**: the env wins, and the 27 branches are dead code                                                                                                     | If supported, Phase 1 (step 1) leaves the plan, and it is the env that would be wrong                                                      |
| Q5  | Can the audit `action: "user.export"` for participant export (D-017) become `participant.export` in **new** records?                        | **No**, not in the refactor. It is a change to persisted data, so it goes to the bug list, and the decision is yours                                                   | Queries and reports on `audit_logs`                                                                                                        |

## Architecture assumptions

| #   | Assumption                                                                                                   | Where it matters                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| P1  | **One replica** on Coolify, about 5 users. The in-memory rate limit and the 60 s settings cache remain valid | doc 03 §9 (no Redis, no port for rate limiting)                                                   |
| P2  | Integration tests keep using a **real Postgres** and are the way to test data access                         | no repositories and no database fakes                                                             |
| P3  | Code in **English** and UI, URLs and persisted data in **Portuguese**                                        | renames `features/salas` → `features/admin/rooms` etc.; the `/admin/salas` URLs do **not** change |
| P4  | Components stay in `PascalCase.tsx` (the majority pattern today); only the two camelCase hooks are renamed   | avoids hundreds of renames with no gain                                                           |
| P5  | shadcn stays in `components/ui` (the CLI uses the aliases in `components.json`)                              | don't move to `shared/ui`                                                                         |
| P6  | `lib/` and `server/` keep their names and change their contents, instead of creating `shared/`               | doc 03 §3                                                                                         |
| P7  | LiveKit remains the only media provider                                                                      | that is why there is only one thin gateway, and not a generic "media" port on the client          |
| P8  | Don't add jsdom or Testing Library; logic moves to `domain/` and the flow is covered by Playwright           | doc 03 §7                                                                                         |
| P9  | `docs/PLANO-ADMIN.md` is historical; new decisions go to `docs/adr/`                                         | Phase 5                                                                                           |

## Limitations of this analysis

- **The integration tests were not run**: Docker was not available (`docker ps` failed). Their description comes from reading the code.
- **I didn't run `pnpm build`**, so as not to overwrite the development environment's `.next/`. Build time and bundle size have no baseline and will be measured in Phase 0.
- Items marked **"probable"** or **"suspected"** in doc 02 (B-01, B-02, B-04, S-02, S-05, among others) were deduced by reading the app and SDK code, without reproducing them in the browser or the container. Phase 0's E5 exists precisely to confirm them.
- The analysis reflects the state of the disk on 2026-10-06, with the mascot WIP included.
- I didn't run `pnpm format` on the documents created. You asked not to run formatters, and that takes precedence over the `AGENTS.md` rule. The `format:check` result is in the final summary.
