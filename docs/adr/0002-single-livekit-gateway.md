# ADR 0002 — A single LiveKit gateway on the server; no ports for database and e-mail

- **Status:** accepted (2026-10-06)
- **Context:** the rule for who may join a room (session, block, e-mail, password, capacity, invitation) lived inside `POST /api/token`, with `new RoomServiceClient` and `new AccessToken` in the middle. Testing any branch required starting a fake LiveKit HTTP server.

## Decision

- The decision is the pure function `decideTokenRequest` (`features/room/domain/issue-token.ts`). Limits, password comparison, participant counting and invitation redemption are passed in as functions.
- The SDK sits behind `LiveKitGateway` (`features/room/server/livekit-gateway.ts`), an object of functions with a single implementation. In tests, it becomes an object literal.
- Database and e-mail do **not** get a port:
  - the database is tested for real in the integration tests;
  - e-mail already falls back to the log without SMTP.
- Domain errors are unions discriminated by code (`{ ok: false, error, log, message }`). There is no `Result` library.

## Consequences

- Every join branch has a unit test that runs in milliseconds (`tests/unit/issue-token.test.ts`).
- The 15 integration tests of `/api/token` passed unchanged, which proves the contract didn't change.
