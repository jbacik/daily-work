# Clock Ceremony — Grill Output (Decisions 14–24)

## Context

This file is the **output of the grilling session** that followed the prototype/spike. The deferred design questions from
`clock-ceremony-grill-handoff.md` (handoff items #1–#12) are now resolved. Decisions are numbered continuing from the
implementation plan's existing 1–13.

**Action required:** fold this content into `C:\Users\JaredBacik\.claude\plans\polished-sleeping-fog.md` (lives on the
Windows working copy; I can't write there from this VM). This file is the source you'll paste from. Also apply the
spike sign-off amendment in §B and the ADR/comment note in §C.

---

## A. Locked decisions (14–24)

| #  | Decision | Surfaces it touches |
|----|----------|---------------------|
| 14 | **Forced-swap UX = meter + inline 422.** Quiet `Today: N/5` indicator at top of clock-in triage. When user clicks `[do today]` past cap, server returns 422 → inline error per item ("Today is full"). **Richer swap UI deferred from PR A** — closes handoff #8 too. | `ClockInTriage.vue` |
| 15 | **Day picker = inline chip strip.** On `[day...]` click, row expands to a horizontal chip strip showing remaining weekdays + Mon-next-on-Friday with capacity badges (`Tue 3/5`). Full days **disabled but visible**. Collapses to a single-button (`[Fri]` / `[Mon next week]`) when only one option remains. **No arbitrary dates.** Reuses the week-capacity data the clock-out modal already loads. | `ClockOutTriage.vue` |
| 16 | **Friday clock-out = identical to Mon–Thu.** Same Wins/Whines/Value Adds for Friday-the-day. Week recap is its own future surface (Wave 3 `WorkWeek`). **PR B does not build a recap UI or a footer link to one.** | `ClockCeremonyModal.vue`, `DailyReflection.vue` |
| 17 | **Reflection ergonomics = nothing surfaced.** No char counter, no fade-to-muted, no `Cmd/Ctrl+Enter` shortcut. Storage is jsonb so the 300-char number was always arbitrary. Standard browser Tab between fields, standard Enter inserts a newline. **Spike sign-off line 41 amended** — see §B. | `DailyReflection.vue` |
| 18 | **Click-to-open only.** No auto-open ever. `ClockStatus` bare-line click is the sole trigger. Always-visible bare line is the daily nudge. | `ClockStatus.vue` |
| 19 | **Single fixed Monday line.** `"Case of the Mondays — Go Get Stuff Done — you got this!"` as a `const` in `ClockInTriage.vue`. Appears **only on clean Mondays** (no triage content from Friday). | `ClockInTriage.vue` |
| 20 | **Soft fail on save error.** Animation cancels mid-way (~250ms ease-out, card returns to slot). Terminal shows `! <action> failed: HTTP <n>` in destructive color. Submit re-enables **immediately** (no lockout). Reflections + already-PATCHed triage preserved. Single-`PUT` atomic write → no partial-success state. | `ClockCeremonyModal.vue`, terminal sub-component |
| 21 | **`[ignore]` vs `[skip]` divergence kept intentionally.** `[ignore]` at clock-in (passive let-go of yesterday). `[skip]` at clock-out (active decision on today's residue). **Document the intent** — see §C. | `ClockInTriage.vue`, `ClockOutTriage.vue` |
| 22 | **No separate quick-out path.** Submit-with-empty IS the fast path (~2.5s ceremony). `[E]xit` cancels — no timestamp write, no reflection persistence; any triage already PATCHed during the session persists (live commits per decision 4). | `ClockCeremonyModal.vue` |
| 23 | **Typed `WorkSessionReflections` record, null-when-empty, fetch-and-parse recap.** EF Core JSON-mapped record on `WorkSession.Reflections` (three nullable strings: `Wins`, `Whines`, `ValueAdds`). At handler boundary, `string.IsNullOrWhiteSpace` each field; if all three null/whitespace, write `null` to the column (not an empty object). Recap reads = `WorkSessions.AsNoTracking().Where(date range).ToListAsync()` → group/project in C#. **No jsonb operators, no GIN index.** Bounded at 5 rows/week. | `WorkSession.cs`, `AppDbContext.cs`, `WorkSessionEndpoints.cs` |
| 24 | **No slash commands for the ceremony.** Bare-line `ClockStatus` is the sole entry. `/punch` stays as-is for manual timestamp edits. Revisit later if real usage reveals friction. | (no change) |

---

## B. Spike sign-off amendments

The visual sign-off bullets at lines 38–44 of `clock-ceremony-grill-handoff.md` stand, **except**:

- **Line 41** — drop the `~300 chars each` clause. The hint becomes `(optional)` or omit the hint line entirely. (Per decision 17.)

Everything else in the sign-off — 60vw modal width, `border-4 border-double border-primary bg-card` frame, inline actions
on triage rows, `✓ Wins / ! Whines / + Value Adds` icons+colors, `rows="2"` textareas, italic placeholders, pulsing `_`
footer with `[C]lock In/Out` and `[E]xit`, idle-state punch-card slot at top, clock-out section order
(leftovers → week capacity → reflection → footer) — unchanged.

---

## C. Code-comment / ADR note

The `[ignore]` vs `[skip]` divergence (decision 21) is **intentional** and load-bearing for the verb energy of each moment.
To prevent a future cleanup from "fixing" them to match, add ONE of:

- **Lightweight:** a short comment near each button — e.g.
  `<!-- [ignore]: passive let-go of yesterday's residue (clock-in moment). See clock-in-out.md. -->`
- **Heavier (recommended if you also want #4's principle captured):** a short ADR in
  `docs/decision-records/` titled "Clock ceremony verb choice: ignore vs skip" — 6–10 lines naming the divergence, the
  energy distinction, and the no-merge-them rule.

Lean: the lightweight comment is enough; only ADR-ify if you're already in the mood to write one.

---

## D. PR A / PR B impact summary

Per the locked PR sequencing (decision 13):

**PR A (clock-in end-to-end) absorbs:**
- 14 (meter + 422), 17 (no surfaced limit — n/a here, no reflections in PR A), 18 (click-to-open), 19 (Monday line),
  20 (soft fail), 21 (`[ignore]` wording + comment/ADR), 22 (no quick-out path), 24 (no slash command).

**PR B (clock-out end-to-end + reflections) absorbs:**
- 15 (day picker chip strip), 16 (Friday = identical), 17 (reflection ergonomics nothing surfaced), 20 (soft fail again
  for the clock-out PUT), 21 (`[skip]` wording + matching comment/ADR), 22 (Submit-with-empty path), 23 (typed
  `WorkSessionReflections` record, EF Core JSON mapping, null-when-empty, fetch-and-parse).

**Out of scope (deferred):**
- Forced-swap richer UI (after 14's meter + 422 ships and is observed).
- Friday week-recap surface and `WorkWeek` write path (Wave 3).
- Slash commands for the ceremony (24, revisitable).

---

## E. What this session did NOT touch

- The implementation plan's existing decisions 1–13 (already approved).
- Spike file cleanup (still deferred to start of PR A per the prior handoff).
- Wave 1 shipped code (`ClockStatus.vue`, `workSession.ts`, `PunchModal.vue`).

---

## Verification (for the next session when PR A starts)

1. **Run** `dotnet run --project aspire/DailyWork.AppHost` and walk both modal modes end-to-end in the browser (per `CLAUDE.md`'s "manual test" guidance — type checking and tests verify correctness, not feature correctness).
2. **API integration tests** for the `PUT /api/work-sessions` extension with `Reflections` payloads (null, all-three-present, partial, empty-after-trim → null column).
3. **Vue component tests** for: capacity meter rendering with `N/5`, inline 422 error per item, chip strip expand + collapse + capacity badges + disabled states, soft-fail animation cancel + terminal error, Monday motivational line appearing only on clean Mondays, `[E]xit` cancel preserves PATCHed triage but not timestamp.
4. **EF Core migration review** (`/migration-review`) for the `WorkSession.Reflections` JSON column.
