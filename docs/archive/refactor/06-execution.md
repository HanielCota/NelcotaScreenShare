# 06 — Refactoring execution

> Executed on 2026-10-06 on the `refactor/arquitetura` branch, starting from the analyzed state (`07e1259`, which includes the mascot WIP). There are 17 small commits, each with green lint, types, tests and E2E. The **move** commits were kept separate from the **extraction** commits, to make review and revert easier.

## What was done, by phase

| Commit                          | Phase    | Contents                                                                                                                                                                                                                                         |
| ------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `7fbdd68`                       | Security | S-01: open redirect (`safeReturnPath` via the URL parser). S-02: admin plugin HTTP routes closed. S-03: limit on wrong passwords when deleting the account. S-04: `bootstrap.sql` redoes the REVOKEs                                             |
| `9dffacd`                       | Security | S-11/B-03: LGPD retention + reprojection every 6 h. S-05: token without `canUpdateOwnMetadata`, with "hand" via `POST /api/sala/mao`. S-10: webhook body size capped, limit on the receiver, no camera in `Permissions-Policy`. S-09, S-06, S-07 |
| `923eb85`                       | Bugs     | B-01, B-02, B-04 (create-owner in the image, **tested in the container**), B-05 to B-13                                                                                                                                                          |
| `d7835db`, `61e8606`            | Phase 0  | Green lint; 12 E2E flows (Playwright); Postgres roles test; knip, jscpd, coverage with a ratchet, size and complexity limits; CI with E2E, `docker build` and schema check                                                                       |
| `771b2b7`                       | Phase 1  | Non-optional database (27 dead branches removed); env validated in one place; auth constants unified; `PASSWORD_LIMITS` everywhere                                                                                                               |
| `7e4161c`                       | Phase 2  | CSV exports through a factory, with real streaming (`pull`); shared period filters and iteration; LGPD data in its own module                                                                                                                    |
| `ecaae1c`                       | 3a/3b    | Panel in `features/admin/*`; generic pieces in `components/`; `AuditTable` split                                                                                                                                                                 |
| `495bb1f`                       | 3d       | Auth and account in `features/auth` and `features/account`; `SessionList` receives the actions via props                                                                                                                                         |
| `4927aa3`                       | 3e       | Home as a Server Component with client islands                                                                                                                                                                                                   |
| `daa4900`                       | 3g       | Mascot: 666-line hook split into controller, animator, reactions, sleep, signals and pure rules; shared global listeners                                                                                                                         |
| `21aad0e`, `a7c966d`, `8987fef` | 3f       | Room: move; token and webhook in layers; PreJoin, RoomView and ScreenStage split; boundaries in the linter                                                                                                                                       |
| `618d126`                       | Phase 4  | Detail pages as Server Components; lint ratchet down to zero                                                                                                                                                                                     |
| (this one)                      | Phase 5  | README updated, ADRs (`docs/adr/0001` to `0004`), this log                                                                                                                                                                                       |

## Metrics: before → after

"Before" is commit `07e1259`, the analyzed state. Measurements were taken with the same tools as the inventory.

| Metric                                                     | Before                | After                                             | Target (doc 04)             |
| ---------------------------------------------------------- | --------------------- | ------------------------------------------------- | --------------------------- |
| `pnpm lint`                                                | 44 errors             | **0**                                             | 0                           |
| Largest non-vendor file                                    | 666 (`use-mascot.ts`) | 360 lines, 300 effective (`mascot-controller.ts`) | ≤ 300 effective ✓           |
| Files above 300 effective lines                            | 6                     | **0** (no exception list)                         | 0 ✓                         |
| Highest complexity                                         | 39 (`PreJoin`)        | **14**                                            | ≤ 15 ✓                      |
| Functions with complexity > 12                             | 23                    | 13                                                | ≤ 8 ✗ (all ≤ 14)            |
| `any` / unsafe casts in the app                            | 0 / 18                | 0 / **0**                                         | 0 ✓                         |
| `if (!db)` / `db!`                                         | 27 / 19               | **0 / 0**                                         | 0 ✓                         |
| Duplication (jscpd)                                        | 2.24% (51 clones)     | **1.67%** (34 clones)                             | ≤ 1.5% ✗ (close)            |
| knip: unused files / deps / exports                        | 2 / 1 / 36            | **0 / 0 / 0**                                     | 0 ✓                         |
| `components → app` imports                                 | 5                     | **0** (blocked by the linter)                     | 0 ✓                         |
| Tests                                                      | 141 (no E2E)          | **201 + 12 E2E**                                  | 8 E2E flows ✓               |
| Line coverage, unit + integration (includes `components/`) | 32.7%                 | **35.3%**                                         | ratchet ✓                   |
| Pure domain coverage (`domain/` + `engine/`)               | —                     | **90.5%**                                         | ≥ 90% ✓                     |
| `features/*/server` + DAL coverage                         | —                     | 85.3%                                             | ≥ 80% ✓                     |
| `server/` (infra) coverage                                 | —                     | 78.8%                                             | ≥ 80% ✗ (close)             |
| `pnpm build` time                                          | ~7–15 s               | ~17 s                                             | no worse ≈ (cache variance) |
| Home JS (gzip)                                             | 215 KB                | **211 KB** (−2%)                                  | −10% ✗                      |
| `/entrar` JS (gzip)                                        | 226 KB                | **188 KB** (−17%)                                 | —                           |
| `/admin/salas` JS (gzip)                                   | 176 KB                | **139 KB** (−21%)                                 | —                           |
| Room JS (gzip)                                             | 405 KB                | 410 KB (+1%)                                      | no worse ✗ (+5 KB)          |

On the missed targets:

- **Room +5 KB:** these are the new modules (mascot listener hub, limit on the receiver, raising the hand through the server) and the cost of splitting files.
- **Home −2%:** almost all of the home's JS comes from the LiveKit SDK, Zod and GSAP, not from the app's code.

## Deviations from the plan (decided during execution)

| Plan item                                            | What happened                                                                        | Reason                                                                                                                                                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useFormSubmit` for the `pending`/`error` pair (×11) | **Not done**                                                                         | The hook would only wrap two `useState`s, without moving complexity out of anywhere                                                                                                                     |
| A single `SignInForm` with `scope`                   | **Not done**; the shared pieces (`FormError`, `PasswordInput`) went to `components/` | The two forms differ on purpose (mascot, e-mail suggestion, validation). Merging them would require conditionals everywhere                                                                             |
| Rename `{ tipo, busca }` in bulk actions             | **Postponed** (ADR 0004)                                                             | It is a contract between table, action and tests; worth changing together with the next change in that area                                                                                             |
| Fewer `"use client"` than the baseline               | **87 files** (previously 73)                                                         | Splitting client components produces more client files. The home, `BrandPanel`, the detail sections and `Section` became server components, and the JS per page dropped on the access and panel screens |
| Lint exceptions "named by phase"                     | The list was **reduced to zero** in Phase 4                                          | —                                                                                                                                                                                                       |

## Behavior changes (bugs and security, on purpose)

All of them are in the security and bug commits. The main ones noticeable in use:

- Login no longer accepts a `?voltar=` that leads to another site.
- Wrong passwords when deleting the account are limited to 5 attempts in 15 min.
- **Raising the hand** now goes through the server. The E2E confirmed it with the real LiveKit.
- A connection failure shows **"Não deu para conectar / Tentar de novo"** ("Couldn't connect / Try again") instead of "Você saiu da sala" ("You left the room").
- Cancelling the screen picker no longer shows a microphone warning.
- The "Acompanhar ao vivo" ("Watch live") link (a nonexistent page) was removed from the room detail.
- Avatar initials follow the same rule (first and last name) in the pre-join and in the room.
- The mascot buttons were removed from the Tab order.
- The panel tables no longer offer "selecionar todos" ("select all") above the limit the server rejects.

## What is left to you

1. **Remote and CI (Q1).** CI and deploy only run with the repository on GitHub. The deploy workflow already rejects triggers coming from forks.
2. **First maintenance run in production.** On the first round (1 min after boot), retention deletes whatever is past its deadline: token requests and IPs older than 6 months, names older than 12, events and login failures older than 30 days. The app is new, so there should be little or nothing to delete. If there is old data to preserve, adjust `RETENTION_DAYS` in `features/maintenance/maintenance.ts` before the deploy.
3. **Coolify.** For real rollback, point the resource to the `:<sha>` tag (README, App section).
4. **Product decisions still open:**
   - audit `user.export` → `participant.export` (Q5);
   - duration of a reopened room (B-14);
   - unknown IP sharing the same limit (S-08, accepted: with Traefik, `X-Forwarded-For` is always present).
5. **Merge.** The `refactor/arquitetura` branch is ready for review. It also includes your mascot WIP, in its own commit (`07e1259`).
