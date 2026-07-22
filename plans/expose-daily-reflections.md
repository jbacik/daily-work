# Expose Daily Reflections (Weekly Sparks + Read-Only Modal + Yesterday Spark)

Surface saved daily reflections (Wins / Whines / Value Adds) in three places: a `✦` footer on every Week-at-a-Glance day card (current + past weeks), a read-only reflection modal opened from that footer, and a filled/outline gold spark on the daily view's YESTERDAY card that opens an add/edit modal for literal yesterday.

## Context

Reflections already exist — stored on `WorkSession` (one row per date, unique index, `Reflections` owned record persisted as JSON) and captured only through the clock-out ceremony (`ClockCeremonyModal` → `DailyReflection.vue`). Once saved they're invisible: no way to view a past day's reflection or to backfill yesterday's. This work is derived from the "Reflection Indicator on Weekly View" design handoff (Option A — spark glyph `✦`), with one deviation the user specified: use the app's **`lunch` gold token** (`text-lunch`, `--lunch: oklch(0.72 0.13 95)` in `web/src/style.css`) instead of the handoff's accent orange. Handoff `--term-*` tokens map to app tokens: `--term-orange` → `lunch`, `--term-ink-3` → `muted-foreground`, `--term-rule` → `border` (dashed).

**Decisions confirmed with the user:**
- Daily-view spark targets **literal yesterday** (today − 1 calendar day, weekends included) — NOT `getPreviousWorkday`.
- "Reflection saved" = `session.reflections !== null` (any field non-empty; the PUT handler already nulls the whole object when all three fields are blank — `WorkSessionEndpoints.cs:99-109`).
- Weekly modal is **strictly read-only**; no edit affordance.
- `— no entry` footer is **inert** (not clickable); only `✦ reflection` opens the modal.
- Outline spark (no reflection yet) is **gold outline**: `✧` in `text-lunch` (filled `✦` also `text-lunch`).

**Key verified facts:**
- Only read endpoint is `GET /api/work-sessions?date=` (single date, 204 when none). **No week/range endpoint exists — must be added.**
- `PUT /api/work-sessions?date=` upserts and **overwrites** `ClockedInAt`/`ClockedOutAt` from the DTO — any save-for-date flow must echo the existing session's timestamps (mirror `saveReflections` in `web/src/stores/workSession.ts:36-42`). PUT accepts null/null timestamps, so a reflections-only session for a never-clocked day works.
- Current week grid: `web/src/components/WeekOverview.vue` (5 cards: label / status glyph / count, legend row at lines 84-91). Past weeks: separate `web/src/components/PastWeekView.vue` (5-day grid, lines 69-110). Both need the footer.
- Modals are bespoke (no base component): `Teleport to body` + `v-if="isOpen"` + `close` emit + window keydown with input-target guards — mirror `StandupPlanningModal.vue`.
- `web/src/utils/week.ts` has `getToday`, `getWeekStart`, `getDateForDayIndex(dayIndex, weekStart)` but **no `getYesterday`** — add it.
- Reuse: `DailyReflection.vue` (props `initial`, emits `update:reflections`, remounts per open) for the edit mode body.

## For Future Agents
This plan should first be saved to the repo at `plans/expose-daily-reflections.md` (Phase 0). As work proceeds: mark checkboxes `- [x]` as items complete; when a phase is done, set its status to `Complete` and write its **Phase Summary**; run the phase's **Verification Plan** and record the result before moving on. When all phases are done, fill in **Final Recap** and **Deployment Plan**. Branch: create `feat/expose-daily-reflections` off `main`. Follow `.claude/rules/` (api.md, vue.md, design-system.md, testing.md, vue-testing.md, commits.md). Never merge autonomously.

## Phase 0: Setup
Status: Complete

- [x] Copy this plan to `plans/expose-daily-reflections.md` in the repo root (create `plans/`)
- [x] Create branch `feat/expose-daily-reflections` from `main`

### Verification Plan
- `git branch --show-current` → `feat/expose-daily-reflections`; `plans/expose-daily-reflections.md` exists

### Phase Summary
Created `plans/` and copied the plan to `plans/expose-daily-reflections.md`. Branched `feat/expose-daily-reflections` off `main` (confirmed via `git branch --show-current`). Note: the pre-existing `packages.lock.json` modification carried over from the working tree — unrelated to this work.

## Phase 1: Backend — week endpoint
Status: Complete

- [x] In `api/src/Endpoints/WorkSessionEndpoints.cs`, add `GET /week` on the existing group: `(AppDbContext db, DateOnly weekOf)` → sessions where `s.Date >= weekOf && s.Date <= weekOf.AddDays(4)`, `.AsNoTracking()`, `.OrderBy(s => s.Date)`, `Results.Ok(list)`. Always 200 with (possibly empty) array — not 204. Entities returned directly, no new DTOs.
- [x] Extend `api/tests/WorkSessionEndpointTests.cs`:
  - `GetWeek_ReturnsEmptyList_WhenNoSessions`
  - `GetWeek_ReturnsSessionsInRange_WhenSessionsExist`
  - `GetWeek_ExcludesSessionsOutsideRange_WhenAdjacentDaysSeeded`
  - `GetWeek_ReturnsReflections_WhenSessionHasReflections`
  - `GetWeek_Returns400_WhenWeekOfMissing`
  - `PutPunch_CreatesReflectionOnlySession_WhenNoTimestamps` (pins null/null-timestamps upsert)

### Verification Plan
- `dotnet test api/tests --filter WorkSessionEndpointTests` → all pass (requires Docker)
- `dotnet format api/src` and `dotnet format api/tests` → no pending changes after commit

### Phase Summary
Added `GET /api/work-sessions/week?weekOf=<Monday>` returning `List<WorkSession>` for the 5-day range `weekOf..weekOf+4` (AsNoTracking, date-ordered, always 200 with a possibly-empty array). Added 6 tests seeding via HTTP PUT (added a private `SeedReflectionAsync` helper). Used date-anchored constants (weekOf 2026-06-08) — day-of-week is irrelevant since the endpoint filters purely by date range. Named the pin test `PutPunch_*` (not `PutSession_*`) to match the file's route-prefix convention; an existing `PutPunch_PersistsReflectionsWithoutClockOut_WhenClockedOutAtNull` covers clock-in-but-no-out, so the new one is distinct (both timestamps null). **Result: 28/28 pass, `dotnet format --verify-no-changes` clean on both projects.**

## Phase 2: Frontend — util + store
Status: Complete

- [x] `web/src/utils/week.ts`: add `getYesterday(today: string = getToday()): string` — literal calendar yesterday via `parseLocalDate`/`toLocalDateString` (comment: distinct from `getPreviousWorkday`, weekends included)
- [x] `web/src/stores/workSession.ts` — keep `today` + existing actions untouched; add:
  - `sessionsByDate = ref<Record<string, WorkSession>>({})`
  - `fetchWeekSessions(weekOf: string)` → `GET /api/work-sessions/week` `{ params: { weekOf } }`, merge each session under its `date` key (catch → leave map as-is)
  - `fetchSession(date: string)` → single-date GET; store in map when found (204/empty → delete key, return null)
  - `hasReflection(date: string): boolean` → `sessionsByDate.value[date]?.reflections != null`
  - `saveReflectionsForDate(date, reflections: ReflectionsInput)` → resolve existing session (map, else `fetchSession`), PUT echoing `clockedInAt`/`clockedOutAt` (nulls when no session), merge response into map; if `date === getToday()` also sync `today` ref
  - Remember the `client.get(...) as any` interceptor pattern — no `.data`
- [ ] Extend `web/src/utils/week.spec.ts`: `GetYesterday_ReturnsPreviousDay_WhenMidWeek`, `GetYesterday_ReturnsSunday_WhenMondayGiven`, `GetYesterday_CrossesMonthBoundary_WhenFirstOfMonth`
- [x] Extend `web/src/stores/workSession.spec.ts` (client module mock): populate map on fetchWeek success; map unchanged on failure; fetchSession stores/clears; `hasReflection` false when reflections null; save echoes cached timestamps (assert PUT payload); save sends null timestamps when no session; save merges response into map; save syncs `today` when date is today

### Verification Plan
- `cd web && npx vitest run src/utils/week.spec.ts src/stores/workSession.spec.ts` → pass
- `cd web && npm run lint` → clean

### Phase Summary
Added `getYesterday` to `week.ts` (literal calendar yesterday; 4 tests incl. month boundary + Monday→Sunday). Extended `workSession.ts` store with a `sessionsByDate` cache and `fetchWeekSessions`/`fetchSession`/`hasReflection`/`saveReflectionsForDate` (all exposed), leaving `today` + existing actions untouched. `saveReflectionsForDate` echoes the cached (or freshly fetched) session's timestamps into the PUT and syncs the `today` ref when the date is today. Note: the store spec mocks `@/api/client` directly (not axios) — used that existing pattern. **Result: 61/61 frontend unit tests pass, lint clean.**

## Phase 3: Frontend — ReflectionModal component
Status: Complete

- [x] Create `web/src/components/ReflectionModal.vue` — ONE component, two modes:
  - Props (destructured per vue.md): `isOpen: boolean`, `date: string`, `mode?: 'view' | 'edit'` (default `'view'`, inline union — not in types/index.ts). Emits `close: []`.
  - Frame mirrors `StandupPlanningModal.vue`: `Teleport to="body"`, `v-if="isOpen"`, overlay `fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm`, panel `bg-card border-4 border-double border-primary flex flex-col w-[640px] max-w-[90vw] max-h-[80vh]`; title bar `border-b-4 border-double border-primary`: `// DAILY REFLECTION` (`text-primary font-bold tracking-wider`) + ` · {date}` in `text-muted-foreground`; action bar `border-t-4 border-double border-primary` with the `[S]`/`[E]` keyboard-key button pattern.
  - On open (`watch(() => isOpen, ..., { immediate: true })`): `store.fetchSession(date)` then seed draft from `session?.reflections` (map nulls → `''`, like `existingReflections` in `ClockCeremonyModal.vue:70-74`).
  - **View mode**: three read-only sections reusing DailyReflection's label glyphs (`✓ Wins` text-success, `! Whines` text-destructive, `+ Value Adds` text-accent); answers `whitespace-pre-wrap text-sm text-foreground`; null field → `<no entry>` italic `text-muted-foreground`. Action bar: `[E]xit` only.
  - **Edit mode**: embed `<DailyReflection :initial="..." @update:reflections="draft = $event" />` (remounts fresh per open via `v-if`). Action bar: `[S]ave` (saving/saved states per StandupPlanningModal) + `[E]xit`. Save → `store.saveReflectionsForDate(date, draft)`, flash saved ~1.2s, then emit close. Error → `ERR: {message}` in `text-destructive`.
  - Keyboard: window keydown in `onMounted`/`onUnmounted`, guard `if (!isOpen) return`; `Escape` always closes; `e` closes and `s` saves (edit mode) only when target isn't INPUT/TEXTAREA/contenteditable (guard pattern from `StandupPlanningModal.vue:182-209`).
  - `data-testid`: `reflection-modal-overlay`, `reflection-modal-title`, `reflection-view-wins|whines|value-adds`, `reflection-no-entry`, `cmd-save`, `cmd-exit`.
- [x] New `web/src/components/ReflectionModal.spec.ts` (mirror Teleport handling from existing modal specs): renders answers in view mode; `<no entry>` placeholder for null field; fetches session for date on open; emits close on Escape and on `e`; embeds + prefills DailyReflection in edit mode; PUT echoes timestamps on save; ignores `s` while typing in textarea; hides save action in view mode

### Verification Plan
- `cd web && npx vitest run src/components/ReflectionModal.spec.ts` → pass; `npm run lint` → clean

### Phase Summary
Created `ReflectionModal.vue` — one component, `mode: 'view' | 'edit'` prop. Mirrors StandupPlanningModal's frame (Teleport, `border-4 border-double border-primary`, `[S]`/`[E]` keyboard-key buttons, window keydown with typing guard). Title `// DAILY REFLECTION · <date>`. On open it `fetchSession(date)` and gates the body behind a `loading` ref so the embedded `DailyReflection` (reads `initial` once) seeds from real data. View mode shows the three answers with `<no entry>` italic placeholders for null fields; edit mode embeds `DailyReflection` and saves via `saveReflectionsForDate`, flashing `aved!` for 1.2s then emitting close. **Result: 10/10 spec tests pass, lint clean.** Sizing note: `w-[640px] max-w-[90vw] max-h-[80vh]` (content-sized, not the 80vw×80vh standup frame).

## Phase 4: Frontend — wire into the three views
Status: Complete

- [x] `web/src/components/WeekOverview.vue`:
  - Fetch: `onMounted(() => sessionStore.fetchWeekSessions(<current weekOf>))` — use the dailyTasks store's `weekOf` if it exposes one, else `getWeekStart()`
  - Footer inside each day cell after the count div (always rendered for equal height): `border-t border-dashed border-border mt-2 pt-1 text-xs`; when `hasReflection(dayDate(i))` a `<button class="text-lunch ..." data-testid="reflection-footer">✦ reflection</button>` opening the modal, else inert `<span class="text-muted-foreground" data-testid="reflection-footer-empty">— no entry</span>` (em-dash)
  - Legend: add `<span><span class="text-lunch">✦</span> reflection saved</span>` to the legend row (lines 84-91)
  - Local modal state `reflectionDate = ref<string | null>(null)`; mount `<ReflectionModal :is-open="reflectionDate !== null" :date="reflectionDate ?? ''" mode="view" @close="reflectionDate = null" />`
- [ ] `web/src/components/PastWeekView.vue`:
  - `onMounted` + the existing `watch(() => weekOf, ...)` (line 26) also call `sessionStore.fetchWeekSessions(weekOf)`
  - Day cells (lines 71-109): add `flex flex-col` to the cell and the same footer block with `mt-auto pt-1 border-t border-dashed border-border` pinned to the bottom; date via `getDateForDayIndex(dayIndex, weekOf)`; same testids; own local `<ReflectionModal mode="view">`
  - No legend changes (PastWeekView has none)
- [ ] `web/src/components/DailyTasksCompact.vue`:
  - `const yesterdayDate = getYesterday()`; `onMounted(() => sessionStore.fetchSession(yesterdayDate))`; `reflectionOpen = ref(false)`
  - YESTERDAY card header right side (lines 156-162): spark button before `shortLabel`, `data-testid="yesterday-spark"` — filled `✦` (`✦`) when `hasReflection(yesterdayDate)`, else outline `✧` (`✧`); **both in `text-lunch`** (user chose gold outline); `title` hint "view/edit reflection" / "add reflection"; click → `reflectionOpen = true`. Renders even when the card is out-of-range (Monday → Sunday).
  - Mount `<ReflectionModal :is-open="reflectionOpen" :date="yesterdayDate" mode="edit" @close="reflectionOpen = false" />`. Save merges into `sessionsByDate`, so the spark flips ✧→✦ reactively — no extra refetch.
- [x] Component tests:
  - New `WeekOverview.spec.ts`: footer shown when reflections exist; `— no entry` when none; click opens view modal; legend item present; footer row present on all 5 cards with mixed data; fetches week sessions on mount
  - Extend `PastWeekView.spec.ts`: footer states; refetches week sessions when `weekOf` changes; click opens view modal
  - Extend `DailyTasksCompact.spec.ts`: filled vs outline spark; fetches yesterday's session on mount; spark click opens edit modal

### Verification Plan
- `cd web && npx vitest run` → full suite passes; `npm run lint` → clean; `npm run build` → clean

### Phase Summary
Wired all three surfaces. WeekOverview: fetches week sessions on mount, always-rendered dashed footer per card (`✦ reflection` button in `text-lunch` when present, inert `— no entry` otherwise), new legend item, local `reflectionDate` driving a view-mode `ReflectionModal`. PastWeekView: cells made `flex flex-col` with the footer pinned via `mt-auto`; fetches week sessions on mount and on `weekOf` change; own view-mode modal. DailyTasksCompact: `getYesterday()` + `fetchSession` on mount; YESTERDAY header shows filled `✦`/outline `✧` spark (both `text-lunch` per user's "gold outline" choice) opening an edit-mode modal. **Two existing specs needed updates:** DailyTasksCompact mocks `@/utils/week` (added `getYesterday`) and needed a `@/stores/workSession` mock; PastWeekView uses the real store + URL-keyed client mock (added a `/api/work-sessions/week` branch). **Result: full suite 270/270, lint clean, `npm run build` clean.**

## Phase 5: Full verification + PR
Status: Not started

- [ ] `dotnet test api/tests` (full suite) and `cd web && npm run test` — both green
- [ ] `dotnet format api/src` + `dotnet format api/tests`, commit any changes; `npm run lint` clean
- [ ] Manual test via Aspire (`dotnet run --project aspire/DailyWork.AppHost`): save a reflection via clock-out → `✦ reflection` footer appears on weekly view and opens read-only modal; a past week with reflections shows footers; yesterday spark filled/outline, opens edit modal, save flips outline→filled and updates weekly footer; verify Escape/`e`/`s` keys
- [ ] Conventional commits per work area (e.g. `feat(api): add week range endpoint for work sessions`, `feat(web): show reflection sparks on weekly and daily views`); PR title `feat: expose daily reflections on weekly and daily views`; do NOT merge

### Verification Plan
- All commands above green; screenshots/manual confirmation of the three surfaces in the running app

### Phase Summary
_(write when phase completes)_

## Final Recap
_(write when all phases complete)_

## Deployment Plan
_(write when all phases complete: local-first app — merge PR after review, `dotnet run --project aspire/DailyWork.AppHost` picks up everything; no schema migration needed — reflections column already exists)_
