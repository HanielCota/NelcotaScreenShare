# ADR 0005 — React Router Framework Mode instead of Next

- **Status:** accepted (2026-10-06); the API handler location was revised on 2026-10-07 (see the end).
- **Context:** keep React, the LiveKit rooms and the existing accounts while removing the dependency on Next. Remix's current path for React applications is React Router in Framework Mode.

## Decision

- React Router 8.4, Vite 8.3, React 19.3 and React Compiler, with SSR on Node 26.9 and the Express 5 adapter.
- Explicit routes in `app/routes.ts`, with modules in `app/routes/`: public pages, `access/`, `admin/access/`, `admin/panel/` and `api/`. Files have English names; existing URLs stay in Portuguese. Each endpoint keeps its private implementation in a `.server.ts` file next to the route module.
- Loaders do reading and authorization on the server. Each protected loader authorizes its own data because layout and page loaders may run in parallel.
- `.server.ts` modules hold database, authentication, configuration and mutations. The build rejects imports of these modules from the browser.
- The UI receives DTOs with only the fields it needs. The room access password stays on the server; the loader sends only `passwordRequired`.
- Operations use `useFetcher`, Zod and explicit policies for session, 2FA, permission, recent login and audit. GET is reserved for search; mutations require POST and a trusted origin. Invitation acceptance and account deletion redirect on the server.
- `AsyncLocalStorage` and the router context limit session memoization to the same request. There is no global user cache.
- Better Auth, Argon2id hashes, cookies, tables and existing migrations are kept. The framework migration doesn't change the schema.
- LiveKit and GSAP Flip go into a chunk loaded after the pre-join screen. The Manrope font is hosted by the app.
- Sentry uses the React Router SDK, with capture in the entries and personal data collection disabled. DSNs are optional and read at runtime.
- SIGTERM/SIGINT drain requests, maintenance, the Postgres pool and the observability transport before exiting.

## Dependencies and compatibility

The direct dependencies were checked against the registry. Babel stays on 7.29.7 because the Sentry 11.4 SDK requires Babel 7; upgrading to Babel 8 now would break that contract. The lockfile pins the resolved versions, installation doesn't add optional peers such as Next, and required peers are declared in the project.

## Consequences

- There is no `next`, `next-safe-action`, Next cache APIs or Nuqs's Next adapter in the runtime.
- The HTTP server is Hono, through `react-router-hono-server` (`app/server.ts`): `pnpm dev` runs React Router's dev server with its Vite plugin, and `pnpm start` runs the built `build/server/index.js`. The Docker image includes the SSR build and production dependencies, without a development server.
- Existing deployments need to rename `NEXT_PUBLIC_LIVEKIT_URL` to `LIVEKIT_URL` and, if used, `NEXT_PUBLIC_SENTRY_DSN` to `PUBLIC_SENTRY_DSN`. The authentication secrets and the database stay the same.
- This ADR supersedes the Next/RSC/next-safe-action-specific decisions of ADR 0001 and of the earlier plans in `docs/archive/refactor/`. The feature boundaries and the domain rules remain valid.
- Integration tests keep using disposable databases. E2E tests run the production build by default; `E2E_DEV=true` allows checking the Vite server.

References: [Framework Mode](https://reactrouter.com/start/framework/installation), [loaders](https://reactrouter.com/start/framework/data-loading), [actions](https://reactrouter.com/start/framework/actions), [error reporting](https://reactrouter.com/how-to/error-reporting).

## Revision (2026-10-07): API handlers live in the features

The decision above said each endpoint keeps its private implementation in a `.server.ts` file next to the route module. That changed with the [ADR 0001 revision](0001-feature-folders-and-dal.md#revision-2026-10-07-one-pattern-and-leftovers-from-next): the handler lives in the owning feature's `server/` folder and the module in `app/routes/api/` only wires it to the URL with `apiLoader`/`apiAction` (`server/api-route.server.ts`).
