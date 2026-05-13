# Clock In / Clock Out — Feature Plan

Personal time-tracking + day-end carryover ritual for the Daily Work app. Captured from a `/grill-me` design session. Implementation is split into **three waves** that can ship independently.

---

## Feature Intent

- **Track** when each work day starts and ends (per-day timestamps, both optional).
- **Use clock-in / clock-out as triage moments** for incomplete SmallThings — clock-in surfaces yesterday's leftovers, clock-out surfaces today's leftovers.
- **Reflect at the week boundary** via a small key-value JSON parking lot (FollowUp / Work / Feedback) on a new `WorkWeek` entity.

The feature is meant to focus daily work, not enable hoarding — keep the data model tight and prefer mutations over duplication.

---

## Final UI Placement (validated via Playwright screenshot)

`ClockStatus` renders **inside the daily view**, between `<DailyTasksCompact />` and the `<div class="grid ... gap-6">` that contains `ScratchPad` + `ReadWatchList`:

```vue
<main v-if="!isPastWeek && view === 'daily'" class="space-y-6 mt-6">
  <DailyTasksCompact />
  <ClockStatus />
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <ScratchPad />
    <ReadWatchList />
  </div>
</main>
```

**Visual treatment:** a single muted line — no border, no card, no panel. Reads as a sibling of the surrounding `$ vim /tmp/scratch.txt` / `$ cat /queue/learning.txt` section headers.

```vue
<div class="flex items-center gap-2 text-muted-foreground text-sm">
  <span class="text-primary">$</span>
  <span>clock-in</span>
  <span class="inline-block w-[0.5em] h-[0.9em] bg-foreground align-text-bottom ml-1 animate-blink"></span>
</div>
```

The same line is the rendering surface for all three states (see Wave 1 §States).

---

## Wave 1 — Session + UI

Pure time tracking. No carryover logic, no `WorkItem` schema changes.

### Data

- New entity `api/src/Entities/WorkSession.cs`:
  - `Id` (int, PK)
  - `Date` (`DateOnly`, **unique**)
  - `ClockedInAt` (`DateTime?`)
  - `ClockedOutAt` (`DateTime?`)
  - `CreatedAt` (`DateTime`, default `UtcNow`)
- `DbSet<WorkSession> WorkSessions => Set<WorkSession>();` on `AppDbContext`.
- Unique index on `Date` in `OnModelCreating`.
- Migration: `AddWorkSessionsTable`.

### API

New file `api/src/Endpoints/WorkSessionEndpoints.cs`, mounted at `/api/work-sessions`, registered in `Program.cs`:

- `GET /today` → today's session, or **204 No Content** if none.
- `POST /clock-in` → create-or-set `ClockedInAt = UtcNow`. **Idempotent no-op** if already set. Returns 200 with the session.
- `POST /clock-out` → create-or-set `ClockedOutAt = UtcNow` (also allowed with no prior clock-in). **Idempotent no-op** if already set. Returns 200.

"Today" is computed server-side as `DateOnly.FromDateTime(DateTime.Now)`. Cross-midnight is handled implicitly: clock-out updates whichever date's session is in flight, even if it now technically belongs to tomorrow.

### Web — types & store

- `web/src/types/index.ts`: add `WorkSession` interface.
- `web/src/stores/workSession.ts` (Setup Store): `today` ref, actions `fetchToday()`, `clockIn()`, `clockOut()`. Calls `client` directly per `vue.md`.

### Web — component

`web/src/components/ClockStatus.vue`. Render the placement above. **Three states**, all rendered as a single muted line — no card, no border:

1. **Not clocked in** — `$ clock-in ▮` (block cursor blinks via the existing `animate-blink` utility in `style.css`). The whole line is the clock-in click target.
2. **Clocked in, not out** — `Grind started @ HH:MM:ss [ clock out ]`. Timestamp is the static 24h start time (no live tick). `[ clock out ]` is the click target.
3. **Clocked out** — `Nice work — HH:MM:ss → HH:MM:ss`. Both timestamps shown until the day rolls over.

### Out of scope for Wave 1

- Slash commands (`/clock-in`, `/clock-out`) — explicitly **descoped**; revisit if keyboard flow proves valuable.
- Manual backfill UI — if you forget to clock in or out, the session row exists with one timestamp null and that's the data.
- Live elapsed-time counter — static timestamps only.

### Tests

- **API** — `api/tests/WorkSessionEndpointTests.cs`, mirroring `WorkItemEndpointTests.cs`:
  - `GetToday_Returns204_WhenNoSessionExists`
  - `GetToday_ReturnsSession_WhenSessionExists`
  - `PostClockIn_CreatesSession_WhenNoneExists`
  - `PostClockIn_IsIdempotent_WhenAlreadyClockedIn`
  - `PostClockOut_CreatesSession_WhenNoneExists`
  - `PostClockOut_UpdatesSession_WhenClockedIn`
  - `PostClockOut_IsIdempotent_WhenAlreadyClockedOut`
- **Web** — `ClockStatus.spec.ts` + `workSession.spec.ts`: all three render states; store actions hit correct endpoints and update state.

---

## Wave 2 — Carryover ritual + `WorkItem` metadata

Adds the two triage modals (clock-in and clock-out) and the metadata that makes them honest.

### `WorkItem` metadata columns

- **`OriginalDate`** (`DateOnly`) — set at creation, **immutable**. Lets history show when a task was first planned vs. when it actually landed.
- **`TimesMoved`** (`int`, default `0`) — incremented every time `Date` is mutated by a carryover action.
- **`IsSkipped`** (`bool`, default `false`) — set by the "Ignore"/"Skip" action. Distinct from `IsDone` (you didn't do it) and from deletion (you want it in historical signal).

Migration `AddCarryoverMetadataToWorkItems` backfills `OriginalDate = Date` for existing rows.

### Clock-in carryover (Tue–Fri)

Triggered on the clock-in click.

**Lookback rule:** the **immediate previous work day**.
- Tuesday → Monday, Wednesday → Tuesday, Thursday → Wednesday, Friday → Thursday.
- **Monday clock-in does not look back** (no Friday bridge — see deferred items).
- **No multi-day bridging.** If yesterday was OOO (no SmallThings created), there is nothing to surface and the modal does not open.

**Query:** `WorkItems where Date = <previous work day> AND Category = SmallThing AND !IsDone AND !IsSkipped`. If empty, no modal opens.

**Modal actions per item:**
- **Do Today** → set `Date = today`, increment `TimesMoved`. If today already has 5 SmallThings, open a **forced-swap sub-prompt**: pick a current SmallThing to bump to tomorrow. The 5-cap is a hard rule and the swap makes the trade-off explicit.
- **Do Later This Week** → set `Date = tomorrow`, increment `TimesMoved`. On Friday clock-in this option flips to **"Do Next Week"** → `Date = next Monday`.
- **Ignore** → set `IsSkipped = true`. Date unchanged.

**Monday clock-in:** skip the carryover entirely. Show a motivational message:

> Case of the Mondays — Go Get Stuff Done — you got this!

### Clock-out carryover (every day)

Triggered on the clock-out click. Surfaces today's incomplete SmallThings so the next morning starts clean.

**Query:** `WorkItems where Date = today AND Category = SmallThing AND !IsDone AND !IsSkipped`. If empty, no modal opens.

**Modal actions per item:**
- **Do Tomorrow** → set `Date = tomorrow`, increment `TimesMoved`.
- **Do Another Day This Week** → date picker limited to remaining weekdays of the current week. Sets `Date`, increments `TimesMoved`. On Friday this collapses to **"Do Monday Next Week"**.
- **Skip** → set `IsSkipped = true`.

**Soft refuse on full target day.** If the chosen target day already has 5 SmallThings, the carryover action fails with: *"Day is full — rearrange first."* The clock-out itself is **never gated** — user can close the modal and clock out with the item still undone. The ritual is a nudge, not a tax.

**Week-capacity preview** lives at the **bottom of the modal** (after the item list). Renders the remaining weekdays of the current week with their SmallThing counts:

```
Wed 3   Thu 5   Fri 2
```

Bold the count when it equals 5. No colors, no charts.

### API additions

- `PATCH /api/work-items/{id}/move` — body `{ date: "YYYY-MM-DD" }`. Mutates `Date`, increments `TimesMoved`. Returns **422** if the target day is full (5 SmallThings).
- `PATCH /api/work-items/{id}/skip` — sets `IsSkipped = true`.

### UI

- `CarryoverModal.vue` — single shared component used by both rituals. Props differentiate clock-in vs. clock-out (source date label, set of triage actions, whether the week preview appears).
- **`TimesMoved` badge on `WorkItemRow.vue` — deliberately deferred from Wave 2.** The column exists and increments; the visual badge ("moved 3x") is added later.

### Tests

- **API:** move endpoint (success, target-full 422, increments `TimesMoved`), skip endpoint, query for incomplete carryover candidates with `IsSkipped` exclusion.
- **Web:** `CarryoverModal.spec.ts` — renders item list, forced-swap sub-prompt, week preview with bold-at-5, soft-refuse error message, Friday "Do Next Week" / "Do Monday Next Week" variants.

---

## Wave 3 — `WorkWeek` entity

A small, intentionally-tight container for week-level reflection notes. Not a parking lot for unscheduled work.

### Data

New entity `WorkWeek`:

- `Id` (int, PK)
- `WeekOf` (`DateOnly`, Monday, **unique**)
- `Items` (`jsonb`)
- `CreatedAt` (`DateTime`)

**Future-ready columns (do not implement yet, just acknowledge):** `EstimatedFocusMinutes`, `ActualFocusMinutes`, `EstimatedMeetingMinutes`, `ActualMeetingMinutes`. These will exist eventually; Wave 3 reserves the entity but adds the columns when a use case actually needs them.

Migration: `AddWorkWeeksTable`. Use `jsonb` in Postgres, not `text`.

### JSON shape

**Tight, predefined keys only.** No append, no arrays — `PUT` replaces the value at each key.

```json
{
  "FollowUp": "reply to eng leaders on deployment stages and review tolerance",
  "Work": "Implemented backlogged Item A",
  "Feedback": "Ali's PR reviews"
}
```

Initial key set: `FollowUp`, `Work`, `Feedback`. Keys outside this set are rejected at the API.

### API

`api/src/Endpoints/WorkWeekEndpoints.cs` on `/api/work-weeks`:

- `GET /{weekOf}` → the week (or 204 No Content).
- `PUT /{weekOf}` → upsert `Items`. Body validated against the predefined key set.

### UI

- **Short term:** slash command `/week-notes` opens a modal showing the current week's `Items` as three labeled inputs (FollowUp / Work / Feedback). Save calls `PUT`.
- **Long term, deferred:** a Monday-planning view reads **last week's** `WorkWeek.Items` and surfaces them as a "review your reflections" panel. Out of scope for Wave 3 — called out so the slot exists in the design.

### Relationship to `WorkItem`

`WorkWeek.Items` and `WorkItem` are independent. The "Do Next Week" action introduced in Wave 2 does **not** write into `WorkWeek.Items` — it simply mutates `WorkItem.Date` to next Monday. Scheduled work lives in `WorkItem`; reflective material lives in `WorkWeek.Items`. The clean separation is intentional: `WorkItem` stays the single source of truth for what's scheduled, `WorkWeek.Items` stays a free-form (but key-constrained) reflection space.

### Tests

- **API:** upsert behavior, predefined-key validation rejects unknown keys, 204 on miss.
- **Web:** slash-command modal opens, saves, reloads with new values.

---

## Cross-Wave Conventions

- **CONTEXT.md:** add `WorkSession`, `WorkWeek`, `OriginalDate`, `TimesMoved`, `IsSkipped` as each wave lands.
- **Commits & branches:** Conventional Commits per `.claude/rules/commits.md`. Wave 1 ships on `claude/add-clock-in-out-9KhsQ`; later waves get their own branches (`feat/clock-in-carryover-ritual`, `feat/work-week-entity` or similar).
- **Pre-push:** `dotnet format api/src api/tests`, `npm run lint`, both test suites must pass.
- **Manual verification:** every wave gets clicked through in the running Aspire app before merge.

---

## Explicitly Deferred (Not in any current wave)

- **Monday clock-in flow beyond the motivational message.** Eventually a richer Monday-planning experience that pulls last week's `WorkWeek.Items` reflection (see Wave 3 long-term UI).
- **End-of-week (Friday) clock-out triage.** Different from the regular clock-out ritual — should ask "what carries to next week, what's done, what's dead." Open question whether this becomes a fourth wave or extends Wave 2.
- **OOO modeling.** OOO = "I wasn't at the keyboard." Currently a convention (zero SmallThings on the day, or one titled OOO that gets marked done). May earn an explicit `IsOutOfOffice` flag on `WorkItem` or a day-state on `WorkSession` later if heuristics aren't enough.
- **`TimesMoved` badge in `WorkItemRow.vue`.** Documented in Wave 2; the column exists from Wave 2 onward, the badge ships later.
- **Slash commands `/clock-in` and `/clock-out`.** Descoped from Wave 1.
- **Manual timestamp backfill UI.** If you forget, the data is what it is.

---

## Open Questions

- Should the Friday end-of-week clock-out triage live in Wave 2 (extends the existing clock-out modal with extra options) or warrant its own wave? Lean: extend Wave 2 once the regular clock-out ritual is shipped and we know what it actually feels like to use.
- Does the Monday motivational message need a single canonical line, or should it rotate from a small list? Default for Wave 2: the single line above.
- How does `/week-notes` discover whether to show the previous week vs. the current week? Default for Wave 3: current week, with a small "see last week" toggle.

---

## Design History

This plan was developed via `/grill-me` across multiple sessions. Key decisions (in order they were locked):

1. The feature is primarily a **trigger for daily triage**, not a stopwatch. Clock-in / clock-out times are persisted as a side benefit.
2. `WorkItem` carryover **moves dates**, doesn't duplicate rows. `OriginalDate` preserves intent; `TimesMoved` exposes punting; `IsSkipped` distinguishes "I chose not to" from "I forgot."
3. The **5-SmallThings/day cap is a hard rule.** Clock-in carryover forces a swap. Clock-out carryover soft-refuses.
4. **One `WorkSession` per day**, both timestamps optional and idempotent.
5. **No slash commands in Wave 1** — the on-page line statement is sufficient.
6. `WorkWeek.Items` is a **tight verb/noun key-value** structure for reflection, not a heterogeneous task pile.
7. **Placement under the daily tasks grid** as a bare line statement, not a bordered card.
