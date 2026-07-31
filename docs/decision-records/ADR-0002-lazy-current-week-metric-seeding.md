# ADR-0002: Work metric weeks are seeded lazily on read, current week only

**Date:** 2026-07-31
**Status:** Accepted

## Context

`WorkMetricDefinition` rows are the persistent checks that should appear every week ("bugs
completed this week", "PRs involved in this week"). Each week needs a materialised
`WorkMetricEntry` per active definition so there is a `<pending>` row to click into and so
`GET /weeks` can report a meaningful `filledCount`.

Something has to create those rows. This app has no scheduler, no background service, and no
hosted job infrastructure — it is a local-first tool that only runs when the developer opens
it. Adding a scheduler for one insert-per-week would be the largest new moving part in the
codebase.

Materialising rows also has to be idempotent, because the same week gets opened many times.

## Decision

`GET /api/work-metrics/entries?weekOf=X` seeds the week as a side effect, under two
conditions:

1. **Only when `X` is the current week** (compared against the injected `IDateTimeProvider`).
2. **Only for titles not already present** in that week — so it is idempotent, and an
   agent-written entry is never duplicated by a later seed.

In practice: seeding fires the first time the Metrics view fetches the current week — for
example, the first time the app is opened on Monday. Past weeks are never back-filled, and
the agent upsert never seeds.

This makes a `GET` mutate state, which is a deliberate exception to normal HTTP semantics.

## Considered Alternatives

- **A background scheduler / hosted service** — the correct answer for a multi-user hosted app,
  and wrong here. The process is not running on Monday morning; the developer's browser is
  what wakes the system up.
- **An explicit `POST /api/work-metrics/weeks/{weekOf}/seed`** — honest about mutating, but the
  frontend would have to call it before every read anyway (it cannot know whether this is the
  week's first open), so it is a second round-trip that is unconditionally required. All the
  cost, none of the clarity.
- **Seeding on definition create instead of on week read** — handles new definitions but not
  the arrival of a new week, so a scheduler is still needed. The current design does seed on
  definition create *indirectly*: the store re-reads entries afterwards.
- **No seeding — synthesise pending rows client-side from active definitions** — no phantom
  writes, but then `filledCount`/`entryCount` in `GET /weeks` cannot be computed server-side,
  ad-hoc and definition-backed entries need different code paths in the UI, and there is no
  row to `PUT` against until the first save.
- **Back-filling past weeks** — would fabricate history that never happened. A week with no
  entries genuinely had no entries.

## Consequences

- No new infrastructure. Seeding happens exactly when someone cares about the data.
- `GET /entries` is not safe to retry blindly by an intermediary that assumes `GET` is pure.
  There is no such intermediary today (no caching layer, no proxy), and the operation is
  idempotent anyway, so the practical risk is nil — but it is a trap for a future reader,
  which is why it is written down.
- A week that is never opened while it is current is never seeded. Opening it later shows only
  what was actually written to it (typically the agent's entries). This is correct but can
  look like missing data.
- Retiring a definition stops future seeding and leaves existing entries alone — retire is the
  intended way to stop tracking something, not delete.
- Deleting a *definition-backed* entry from the current week would be undone by the next
  seed-on-read. The UI therefore hides the delete affordance on those rows (retire the
  definition instead); the API does not block it.
