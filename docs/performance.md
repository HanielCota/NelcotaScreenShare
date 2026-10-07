# Performance review — 2026-10-07

This review covers browser loading and rendering, SSR, authentication, room startup, PostgreSQL queries and indexes, webhook projection, pagination, exports, and periodic maintenance. Measurements use Node 26.9, the production build, Chromium, and local PostgreSQL 18.6. They are development measurements, not production latency guarantees.

## Measured improvements

| Measurement                             |          Before |         After | Method                                                    |
| --------------------------------------- | --------------: | ------------: | --------------------------------------------------------- |
| Initial home resource transfer          |         2.41 MB |       0.85 MB | Chromium Resource Timing; HTML excluded                   |
| JavaScript needed by the pre-join route | 1,369,189 bytes | 849,985 bytes | Unique static module graph, including entry and root      |
| Mascot atlas                            | 1,438,073 bytes | 519,664 bytes | Lossless WebP, identical alpha and all visible RGB pixels |
| First room page                         |       13.861 ms |      0.035 ms | `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`                 |
| Room audio publications                 |       18.464 ms |      0.039 ms | Same SQL filter before/after the index                    |
| Audio track ending lookup               |       13.483 ms |      0.029 ms | Same SQL filter before/after the index                    |
| Room page after 90,000 earlier rows     |        2.735 ms |      0.039 ms | OR cursor versus tuple cursor, both with the new index    |

SQL measurements are medians of five executions after loading and analyzing an isolated, disposable database with 100,000 rooms and 300,000 webhook events. The first-page SQL measurement includes the ordering correction described below. Timings exclude network round trips and ORM processing. The transfer figures come from local browser captures; HTTP compression and the image account for most of the reduction. Absolute paint timings were not used to claim a production improvement.

## Changes

### Browser and room startup

The pre-join microphone meter imported `livekit-client` through both capture and error handling. This made the complete WebRTC SDK part of the initial module graph, despite the lazy-loaded call UI. The preview now uses `getUserMedia`, `MediaStreamTrack`, and Web Audio directly, with the same analyser sensitivity, device switching, permission messages, and teardown. Lifecycle tests cover cancellation, hardware ending, enumeration failures, and cleanup.

The call UI starts downloading when the join button is focused or hovered, and alongside the token request on submission. This overlaps loading with the user's intent and the server request while keeping the SDK outside the initial render.

The mascot uses a lossless WebP atlas. Verification compared alpha and every RGB channel with nonzero alpha. The original PNG remains available as the source artwork. The entrance animations now complete in about 280 ms; the home page applies no entrance fade when reduced motion is requested.

### HTTP and authentication

The production Express server compresses eligible HTML, JavaScript, CSS, and data responses and sends `Vary: Accept-Encoding`. Existing asset cache policies remain in place. An E2E test checks compressed HTML and JavaScript and validates their decoded contents.

Authenticated page loads previously issued an `UPDATE users` even when the conditional update affected zero rows. The session reader now skips that database round trip when the authoritative session result already shows access within the last hour. The SQL condition still handles concurrent writes when an update is needed. Authentication continues to be checked against the database on each request.

The room, participant, share, and audit lists now start their page and capped count queries together. These reads are independent, so a normal pooled connection no longer adds their network round trips sequentially. Exports continue to skip counts.

### PostgreSQL and webhooks

Migration `0008_performance_indexes.sql` adds four indexes:

- A partial room activity index without a leading status column, for the default list and command search.
- Partial room start and peak indexes, for the other supported sorts.
- A composite event index on room, event type, participant SID, track SID, and occurrence time, for audio publications and their ending lookups.

The original room activity index starts with status and cannot directly serve an unfiltered activity order. The measured plan changed from scanning and sorting the room table to reading the first 26 matching index entries. Audio lookups changed from scanning 300,000 raw events to a small index range.

Keyset pagination uses `(sort_column, id)` comparisons for non-null sort columns. Previously the OR predicate read and rejected 90,001 earlier entries in the measured deep page. The corrected query seeks directly to its cursor. NULL ordering on both sort keys now matches the existing Drizzle indexes; nullable sorts retain their forward/backward semantics. Integration tests cover ties, exact timestamp precision, and nullable values.

Audio reconciliation now updates only rows whose `with_audio` value actually changes. Replaying an unchanged projection avoids rewriting share history, updating timestamps, and generating unnecessary WAL.

## Other reviewed paths

The database pool has a maximum of five connections. Increasing it without production queue and query measurements would not address the identified table scans. Settings already have a per-process TTL cache, and parallel loaders share request-scoped session results. Table counts are capped at 10,001 examined matches. CSV exports iterate bounded keyset batches rather than loading their entire result into memory. Pointer and reaction traffic are bounded, and the microphone meter writes through refs instead of rendering React on every frame.

Maintenance runs outside request handling and prevents overlapping runs in one process. Its retention operations can still affect database I/O when substantial expired history accumulates. Production monitoring should compare slow queries, lock waits, temporary files, CPU, disk latency, and connection wait time during those runs. The checked-in PostgreSQL configuration already enables slow-query logging, `pg_stat_statements`, lock-wait logging, and temporary-file logging.

## Applying and validating

The measurements were collected in disposable test databases. Migration `0008_performance_indexes` has also been applied to the local application database (`nelcota` on loopback PostgreSQL). All four indexes are valid and ready, table statistics were refreshed, and read access through the application role was verified. For other environments, apply it through the normal migration/deployment job with `MIGRATOR_DATABASE_URL`. The indexes consume additional disk and add work to writes; migration lock timeout is already bounded by the migrator.

The application changes passed formatting, type checking, lint, the production build, 303 unit/integration tests, and 22 Chromium E2E tests.

```sh
pnpm db:migrate
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
```

For production diagnosis, capture TTFB and Resource Timing on the slow page and correlate the request with server logs and PostgreSQL query statistics. Compare `EXPLAIN (ANALYZE, BUFFERS)` for actual slow SELECT statements using the production data distribution. Do not run load seeding against the application database.
