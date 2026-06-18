# Handoff — Clock Ceremony Modal (Punch-Card) Prototype Session

**Date:** 2026-05-28
**Branch:** `feat/punching-in-out` (long-lived feature branch, based on `origin/main`)
**Local HEAD:** `4b1e937` ("planning assets") — working tree clean, in sync with remote.
**Next session focus:** Prototype the **7A design-system-conformant** version of the punch-card clock modal.

---

## What this is

We're building a richer clock-in/clock-out experience for the Daily Work app. A high-fidelity
prototype was hand-built and pushed; this session grilled the design and locked the major decisions.
The next session is a **prototype/build session** to turn the raw prototype into a
convention-conformant component (decision 7A below).

## Don't re-read these from scratch — reference them

- **3-wave feature plan (the canonical design):** `docs/feature-plans/clock-in-out.md`
- **Raw prototype component (hand-built, NOT yet conformant):** `docs/feature-plans/PunchClock.vue`
- **Prototype's own handoff/usage doc:** `docs/feature-plans/PunchClock-Handoff.md`
- **Shipped Wave 1 bare-line component (stays, becomes a trigger):** `web/src/components/ClockStatus.vue`
- **Shipped store:** `web/src/stores/workSession.ts`
- **Shipped manual-edit modal (stays as-is):** `web/src/components/PunchModal.vue` (the `/punch` command)
- **Design tokens:** `web/src/style.css` (oklch tokens; `--radius: 0`; font is JetBrains Mono; `animate-blink` is the precedent for where keyframes live)
- **Conventions:** `.claude/rules/vue.md`, `.claude/rules/api.md`, `.claude/rules/migrations.md`, `.claude/rules/vue-testing.md`, `.claude/rules/testing.md`, `.claude/rules/commits.md`
- **Already shipped to main:** PR #82 (Wave 1 WorkSession + ClockStatus), PR #89 (`/punch` PunchModal + `PUT /api/work-sessions`)

---

## Decisions LOCKED this session (not yet in any plan doc — capture these)

1. **Augment, not replace (Q1=B).** The bare-line `ClockStatus.vue` stays always-visible on the daily
   view. The `/punch` `PunchModal` stays as-is (narrow job: manual start/end time correction). A **new
   rich modal** is the third surface, opened when the user actions clock-in or clock-out.
   - *Role change:* `ClockStatus` click currently mutates directly (`clockIn()`/`clockOut()`); it must
     change to **open the new modal** instead.

2. **The new modal IS the Wave 2 carryover ritual (Q2=2B)**, wearing the punch-card animation.
   This means this work pulls in Wave 2 scope: `WorkItem` metadata (`OriginalDate`, `TimesMoved`,
   `IsSkipped`), a migration, and `PATCH /api/work-items/{id}/move` + `/skip` endpoints (see plan doc Wave 2).

3. **Flow / sequencing of the ceremony (correction to original assumption):**
   reconcile/triage FIRST → then hit **Submit/Clock-In** → **the punch-card animation runs WHILE the
   timestamp is saved**. The animation is the **commit ceremony**, not an opening flourish.

4. **Modal always opens on a clock-in/out action (Q3).** Triage is just one *section* inside it.
   Clean day → empty-state message + punch. Monday → "Case of the Mondays" motivational line + punch
   (no lookback). **Retires the plan's old "empty = no modal" rule.**

5. **Commit semantics (Q4): live triage, punch on submit.** Each Do Today/Later/Ignore fires its own
   immediate `move`/`skip` PATCH. The clock timestamp writes **only on Submit**. Bail before submit =
   triage kept, NOT clocked in. Idempotent/forgiving on reopen (already-moved items drop off the list).

6. **Clock-out (Q5 + expansion):** shared modal in `out` mode. Surfaces **today's** leftovers
   (Do Tomorrow / Do Another Day This Week / Skip), week-capacity preview at the bottom (bold at 5),
   soft-refuse on a full target day, and **the punch-out is NEVER gated**.
   - **NEW: clock-out also captures 3 optional reflection prompts** — **Wins / Whines / Value Adds**
     (~300 chars each, *soft* UI hint, **no hard server limit** per scratch-pad precedent). Purpose: feed
     a future **Friday recap**. Clock-in stays triage-only (no reflection prompts).

7. **Modal structure (locked):** one shared **`ClockCeremonyModal`** shell owns the punch-card
   animation + `mode: 'in' | 'out'`. Divergent bodies extracted as child components:
   **`ClockInTriage.vue`**, **`ClockOutTriage.vue`**, **`DailyReflection.vue`**.

8. **Reflection data model (Q6):** a single **`jsonb` column on `WorkSession`** (e.g. `Reflections`)
   holding keyed values `Wins` / `Whines` / `ValueAdds`. Key-constrained like Wave 3's `WorkWeek.Items`.
   New migration adds the column. Written on clock-out Submit.

9. **Convention conformance (Q7=7A — THIS SESSION'S BUILD TARGET):**
   The prototype's palette is the right *family* but hardcoded hex bypassing the token layer. Port it:
   - **Map every color that has a token → semantic Tailwind class:** `bg-card`, `bg-background`,
     `border-border`, `text-foreground`, `text-primary` (the blue), `text-accent` (the orange),
     `text-muted-foreground`.
   - **Adopt `radius: 0` and JetBrains Mono** (drop `Courier New`); **drop the box-shadows**.
   - **Keep only the irreducible `@keyframes`** (scan-sweep, success flash) in a small `<style scoped>`
     block. (Do NOT globalize a pile of one-off `@utility`s — that was 7B, rejected.)
   - **Convert `defineProps({...})` object syntax → type-based `defineProps<{}>()`** with reactive
     destructure (per `vue.md`).
   - **Success-green has no token:** reuse `--accent` or drop the green flash. Do NOT add a token for one flash.

---

## OPEN — not yet decided (grill/resolve before or during build)

- **Single-user vs employee model.** Prototype has `employeeName` / `employeeId: 20210628` / "VIRTUOUS" /
  references an "auth store." App is **single-user, local-first, no auth**. Decide: strip the employee
  concept entirely vs hardcode/config a name. (Leaning: strip it — there's no user identity in this app.)
- **Animation ↔ save timing & failure.** Animation ~2.5s vs API call ~50ms. What does the user see if the
  clock POST fails mid-animation? Define the Submit handler contract (run-and-await? optimistic + rollback?).
- **API contract for clock-out + reflections.** Extend `POST /clock-out` to accept a body, or use the
  existing `PUT /api/work-sessions` (added in #89) to write reflections? `move`/`skip` endpoints (Wave 2)
  don't exist yet.
- **Trigger mechanics / slash commands.** Confirm `ClockStatus` click → opens modal. Add `/clock-in` `/clock-out`
  commands? (Plan descoped them; `/punch` exists as precedent.)
- **5-cap forced-swap sub-prompt** UI on clock-in "Do Today" when today already has 5 SmallThings (plan Wave 2).
- **Friday recap surface** — downstream; just ensure data is captured now.
- **Sequencing into shippable PRs** off `feat/punching-in-out` (e.g. (a) WorkSession.Reflections + WorkItem
  metadata migration + endpoints, (b) ClockCeremonyModal shell + 7A conformance, (c) triage bodies,
  (d) reflection body, (e) wire ClockStatus trigger).
- **Plan open questions** still unresolved: Monday message single-vs-rotating; Friday end-of-week triage as
  its own wave vs extension.

---

## Suggested skills for the next session

- **`/grill-me`** — resolve the OPEN items above (especially employee-model strip, animation/save failure,
  and the clock-out reflections API contract) before writing code.
- **`run`** skill — launch the Aspire app to prototype/verify the modal visually (the whole point of 7A is
  the look — must be seen in-browser, not just unit-tested).
- **`/test-plan`** — enumerate xUnit + Vitest cases before writing tests (WorkSession.Reflections persistence,
  modal render states, triage live-persist, punch-on-submit, never-gated clock-out).
- **`/migration-review`** — verify the new EF Core migration (WorkSession `Reflections` jsonb + WorkItem
  `OriginalDate`/`TimesMoved`/`IsSkipped`) before committing.
- **`/update-context`** — add new terms: `ClockCeremonyModal`, `WorkSession.Reflections`,
  Wins/Whines/Value Adds, and the clock-as-triage-trigger framing.
- **`/create-adr`** (optional) — the augment-not-replace + "modal IS the carryover ritual" decisions are
  significant and non-obvious; worth an ADR in `docs/decision-records/`.

## Working agreement / guardrails

- Develop on `feat/punching-in-out`; branch smaller iterations off it; merge back via PRs. Never push elsewhere.
- Conventional Commits (`.claude/rules/commits.md`). Run `dotnet format`, `npm run lint`, and both test suites before pushing.
- Never merge autonomously. Don't open a PR unless explicitly asked.
- Session is in **plan mode** — confirm whether the next session should stay in plan mode or build.
