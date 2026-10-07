# ADR 0001 — Feature folders, Next's DAL and pure domain only where there are rules

- **Status:** accepted (2026-10-06); the Next-specific decisions were superseded by [ADR 0005](0005-react-router-framework.md).
- **Context:** the code was organized by technical type (`components/`, `lib/`, `hooks/`, `server/`), but `features/` existed only for the panel. `components/` imported actions from `app/`, there were three auth folders and `lib/` held domain rules. No automated rule could say what was allowed to depend on what.

## Decision

- Each domain lives in `features/<name>/` (`room`, `mascot`, `auth`, `account`, `admin/*`, `participants`, `home`, `maintenance`), with subfolders as needed:
  - `ui/` and `hooks/` (React);
  - `actions.ts` (the edge: Zod and authorization through next-safe-action);
  - `server/` (`server-only`: queries and mutations with Drizzle directly, which is the DAL recommended by Next 16);
  - `domain/` (pure TypeScript).
- `components/` and `lib/` hold only what is generic; `server/` holds only infrastructure.
- `domain/` exists **only** where there are real rules: the token decision, the mascot rules, the room protocol, presence, sign-up and participant actions. Panel listings go straight from the page to `queries.ts`.

## Rejected alternatives

- **Full Clean Architecture** (a repository and an interface for everything): would double the files with no gain. Drizzle is already the data abstraction, and integration tests against a real Postgres verify SQL, constraints and triggers better than fakes.
- **Keep the by-type organization** and just split large files: doesn't fix the inverted dependencies nor allow boundary rules.

## Consequences

- "Where does X live?" has one answer.
- Boundaries are enforced by the linter (ADR 0003).
- Paths changed en masse: the move commits were kept separate from the extraction commits, to make review and revert easier.

## Revision (2026-10-07): one pattern and leftovers from Next

The organization had drifted from the decision above:

- the endpoints in `app/routes/api/` had `x.ts` + `x.server.ts` pairs, with the logic (validation, rate limit, LiveKit) inside `app/`;
- the operations mechanism was spread over six places, half of them in `features/auth`, and `features/participants/server/operations.server.ts` used the same name for something else;
- each feature had its own scheme (`engine/` and `dom/` in the mascot, loose files in the panel);
- there were single-file folders (`features/maintenance`, `features/participants`, `server/actions`, `server/audit`) and business rules in `server/` (`settings.server.ts`).

Decided:

- **The same pattern in every feature**, including the panel ones: `domain/`, `server/`, `client/`, `hooks/`, `ui/` and `actions.ts`/`actions.server.ts`, only those that are needed. `engine/` and `dom/` are gone.
- **Thin routes:** each endpoint's handler lives in the owning feature (`features/room/server/token-route.server.ts`) and the route only wires it to the URL with `apiLoader`/`apiAction` (`server/api-route.server.ts`). The folders in `app/routes/api/` mirror the URL.
- **Operations with one place per role:** `lib/operations/` (descriptor and hook), `server/operations/` (validation, errors, HTTP dispatch), `features/auth/server/operation-policies.server.ts` (who may call) and `app/operations.server.ts` (registry). The `origin-guard` is infrastructure and moved to `server/`.
- **Shared pieces get their own folder:** `features/security` (sessions and 2FA, used by the account and the panel), `features/runtime` (startup and maintenance), `components/shell` (header, navbar, theme), `lib/animation`.
