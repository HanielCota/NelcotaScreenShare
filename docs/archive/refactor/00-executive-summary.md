# 00 — Executive summary

> **Status:** plan executed on 2026-10-06 (branch `refactor/arquitetura`). The result, the before → after metrics and the deviations from the plan are in [06-execution.md](06-execution.md).

## Diagnosis

The server is disciplined: zero `any`, `strict`, Zod at every edge, a DAL with `server-only`, no circular imports and only 2.24% duplication. The pain is concentrated in four hot spots, and the guardrails that should contain them are not running.

## What is wrong (by cost)

1. The guardrails protect nothing. `pnpm lint` fails with 44 errors, and the repository has no `git remote`, so the described CI and deploy have never run (D-051).
2. There is no safety net on the main flow. No client tests and no E2E: pre-join, connection, screen sharing and leaving are uncovered (D-046).
3. There are god files on the critical path:
   - `use-mascot.ts` (a `useEffect` of about 590 lines, growing with the WIP);
   - `PreJoin.tsx` (complexity 39);
   - `RoomView.tsx` (connection, layout and errors together);
   - `POST /api/token` (165 lines, business rules in the handler, SDK instantiated inside).
4. The organization changed criteria halfway through:
   - `features/` exists only for the admin;
   - `components/` imports actions from `app/`;
   - there are three auth folders;
   - `lib/` became a domain junk drawer;
   - names mix pt/en, and `TokenResult` has two meanings.
5. Duplication is concentrated in the panel: 4 CSV exports, 4 `iterate`/`list`/period filters, and table filters that are 90% identical.
6. The "optional" database is fake: 27 `if (!db)` branches that never run, with types that lie.

In parallel, the review turned up out-of-scope findings, to be fixed in their own PRs:

- Post-login open redirect via `?voltar=/%09/evil.com` (S-01, confirmed in the code).
- Better Auth admin plugin endpoints exposed without 2FA or audit (S-02).
- Account deletion without rate limiting (S-03).
- A connection failure shows "Você saiu da sala" ("You left the room") instead of "Tentar de novo" ("Try again") (B-01).
- Webhook events lost without reprocessing (B-03).
- `create-owner` probably broken in the Docker image (B-04).

## What we propose

Feature folders + the Data Access Layer that Next 16 itself recommends + a pure core only where there are rules. Not full Clean Architecture.

- `features/{room, home, mascot, auth, account, participants, admin/*}`, each with `ui/` → `actions.ts` → `server/` (queries and commands with Drizzle directly) → `domain/` (pure TS).
- `components/`, `lib/` and `server/` are only for what is generic and for infrastructure.
- A single "port" (the LiveKit server SDK gateway for issuing the token). No repositories, no interface for database or e-mail and no `Result` library. Integration tests against a real Postgres already play that role better.
- Boundaries are enforced by the existing oxlint (`no-restricted-imports` per folder + `no-cycle`), with knip, jscpd and `drizzle-kit check` in CI. dependency-cruiser was ruled out because the installed TypeScript 7 doesn't expose the JS API it needs (verified).
- Verifiable example: `/api/token` becomes an HTTP edge of about 30 lines, plus orchestration on the server, a pure decision testable per branch and an SDK gateway, with the same contract, the same messages and the same order of checks (doc 03 §6).

## Effort and recommended order

| Order | Phase                                                                                                                         | Hours   | Risk       |
| ----- | ----------------------------------------------------------------------------------------------------------------------------- | ------- | ---------- |
| 0     | Security fixes S-01..S-03 (own PRs, outside the refactor)                                                                     | ~3      | low        |
| 1     | Phase 0: green lint, real CI, dead code, knip/jscpd, Playwright with 8 flows and characterization tests                       | 22      | low        |
| 2     | Phase 1: cross-cutting (non-optional database, single env, constants, `server-only`)                                          | 6       | low        |
| 3     | Phase 2: panel helpers (CSV, periods, iterate) and DAL out of the pages                                                       | 7       | low        |
| 4     | Phase 3: features in this order: settings/search → panel → auth/account → home → mascot → live room (last, the most critical) | 58      | low → high |
| 5     | Phase 4: split the large components and adjust the server/client boundary                                                     | 8       | medium     |
| 6     | Phase 5: README, ADRs, tighten the lint ratchet                                                                               | 5       | low        |
|       | Refactor total                                                                                                                | ≈ 106 h |            |

Each phase is deployable and delivers value on its own, so you can stop after any of them with the project better than before. The refactor has no database migration. The quick wins (under 1 h each) are in doc 04 §3.

## Documents

| Doc                                                    | Contents                                                                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| [01-inventory.md](01-inventory.md)                     | Annotated tree, import graph, routes and actions, flows, dependencies and metrics                            |
| [02-diagnosis.md](02-diagnosis.md)                     | 55 problems with evidence, out-of-scope findings (11 security and 14 bugs) and a ranking of the 10 costliest |
| [03-target-architecture.md](03-target-architecture.md) | Layers, dependency rule, target tree, end-to-end example, decisions and where not to apply SOLID             |
| [04-migration-plan.md](04-migration-plan.md)           | Safety net, phases with criteria and rollback, quick wins, metrics and risks                                 |
| [05-open-decisions.md](05-open-decisions.md)           | 5 questions, 9 assumptions and the limitations of the analysis                                               |

**Next step:** approve the target architecture (doc 03) and the phase order (doc 04) and answer Q1–Q5 in doc 05. Nothing will be implemented before that.
