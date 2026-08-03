# ADR-0001: Work metric entries are upserted on a `(WeekOf, Title)` natural key

**Date:** 2026-07-31
**Status:** Accepted

## Context

The weekly work metrics feature has two writers: the app, and a detached Claude CLI that
runs weekly and fills in values like "bugs completed this week". The external agent needs a
write path it can call repeatedly without creating duplicates and without holding any local
state.

An agent that has to first `GET` a list, find the right row, extract an `id`, and then `PUT`
to `/entries/{id}` is three round-trips and a stateful conversation. Worse, if the read and
the write disagree — because seeding ran in between, or the agent cached an id from last
week — it writes to the wrong row or fails.

The natural identity of an entry is "the thing called X for the week of Y". That is already
unique, and both writers know it without a lookup.

## Decision

`(WeekOf, Title)` is a unique index on `WorkMetricEntry` and the key the agent upserts on:

```
PUT /api/work-metrics/entries   { weekOf, title, value }
```

Create-or-replace in one call, uniform `200`, no id involved. `Title` on an entry is a
**snapshot** — renaming a `WorkMetricDefinition` does not rewrite entries that already
exist, so history keeps the title it was recorded under.

Two guardrails fall out of this and are deliberate:

- `weekOf` must be a valid Monday or the request is a `400`. The API never snaps to the
  nearest Monday — an agent writing to the wrong week silently is worse than a loud failure.
- Title matching is exact (trimmed, case-sensitive), matching the database index. No fuzzy
  matching, no case folding.

`value` is **replaced**, never appended. That is precisely what makes a re-run idempotent.

## Considered Alternatives

- **Surrogate-id writes (`PUT /entries/{id}`) only** — forces the agent into a read-then-write
  dance and gives it a stale-id failure mode. Kept for in-app edits, where the UI already
  holds the entity.
- **Agent-supplied idempotency key / `If-Match` ETag** — solves duplicate writes, but the
  agent still needs a prior read to know which row it is talking about. More machinery for
  less.
- **Denormalising the title away (entries reference `DefinitionId` only)** — makes renames
  propagate through history, which is the wrong default for a record of what happened. Also
  leaves ad-hoc entries (no definition) with nowhere to put their title.
- **Case-insensitive title matching** — friendlier to a hand-written agent script, but the
  unique index is case-sensitive, so the API and the database would disagree about what a
  duplicate is.
- **An `append: true` flag on the upsert** — genuinely useful someday, and trivially additive
  later. Not built now; replace-only keeps the idempotency guarantee unambiguous.

## Consequences

- The agent contract is one stateless call, documented in `docs/work-metrics-agent-contract.md`.
  Re-running the weekly job is always safe.
- Title strings become part of the integration surface. Renaming a definition **changes what
  the agent should write next week** — the agent must read titles from
  `GET /api/work-metrics/definitions` rather than hardcode them. Once agent scripts exist in
  the wild, this is expensive to change, which is why it is recorded here.
- Renaming a definition mid-week leaves the old entry in place and seeds a second pending
  entry under the new title on the next read of the current week. That is the visible cost of
  snapshotting; it is preferable to silently rewriting history.
- Deleting a definition nulls `DefinitionId` (`ON DELETE SET NULL`) — entries survive as
  ad-hoc rows and history stays intact.
- An agent typo creates a new ad-hoc entry rather than erroring. Cheap to delete in the UI,
  but the API cannot distinguish a typo from an intentional one-off.
