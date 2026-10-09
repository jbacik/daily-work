# Tuning /daily-standup output: capture draft-vs-submitted pairs

## Context

Short answer: **yes, collecting "what the model wrote" vs "what I actually submitted" is the most valuable feedback you can produce.** Your edits *are* the feedback. They're specific and they cost you nothing extra. "Make it better" in the abstract never gets you that.

The catch is that today the app throws away half of each pair:

- `POST /api/standup/generate` ([StandupEndpoints.cs:129](api/src/Endpoints/StandupEndpoints.cs:129)) returns markdown and **persists nothing**.
- `POST /api/standup` ([StandupEndpoints.cs:53](api/src/Endpoints/StandupEndpoints.cs:53)) saves the final, edited markdown and **overwrites** in place.
- The context JSON, opener, and prompt variant that produced the draft are also lost.

So you only ever keep the final version. You can't see what changed, and you can't tell which inputs caused a bad draft.

Also worth knowing: the prompt in [StandupPrompts.cs](api/src/Prompts/StandupPrompts.cs) is already very rule-heavy. That's a sign it has been tuned by adding a rule each time something broke. Real examples will usually do more than another rule.

## How to give useful feedback (the process, independent of code)

1. **Collect 10–20 pairs** of (generated draft, what you posted to Geekbot). That's about 2–4 weeks of standups. Mix Mon/mid-week/Fri days, and include days with no One Thing, carried items, PTO, and syncs.
2. **Label each edit by category, not by instance.** For example: "too wordy", "wrong tone on opener", "listed syncs I don't care about", "dropped a carried item", "reworded task titles worse than mine". Patterns across many pairs matter. One-off nitpicks don't.
3. **Turn the patterns into changes, in this order:**
   - **Few-shot examples first.** Put 2–3 of your best *submitted* standups into the system prompt as "this is the voice/shape I want". Fresh real examples beat abstract style rules, especially on a small model at temp 0.35.
   - **Delete rules that the examples now cover.** Fewer, clearer instructions.
   - **Fix it in code, not the prompt, if it's deterministic.** `StandupContextBuilder` already does this (precomputed statuses, the opener picked in C#). Anything you always fix by hand the same way, like filtering certain sync meetings or shortening titles, belongs in the context builder.
4. **Replay before shipping a prompt change.** Re-run the new prompt against the stored contexts and diff the output against your submitted versions. That's a cheap regression check, so a fix for Friday doesn't break Tuesday.

## Proposed implementation: make the app capture pairs automatically

### 0. Save this plan to the repo
- First action after approval: copy this plan verbatim to `plans/standup-feedback-capture/plan.md`. That follows the existing `plans/weekly-work-metrics/plan.md` layout and keeps the plan for later reference.

### 1. Persist the generation (API)
- New entity `StandupGeneration` in `api/src/Entities/`: `Id`, `Date` (DateOnly), `CommType`, `PromptVariant` (string, e.g. `"midweek-v3"`), `SystemPrompt` (text), `UserMessage` (text, which includes the context JSON and the opener), `GeneratedMarkdown` (text), `CreatedAt`.
  - Store the full system prompt + user message instead of only a version tag. It's single-user, so the storage cost is trivial, and it makes replay exact.
- In the `/generate` handler, after `GetChatMessageContentAsync`, insert a row. Return its `generationId` along with `markdown`.
- Add a nullable `GenerationId` (int?) on `UpdateComm`. `POST /api/standup` accepts an optional `generationId` in `SaveUpdateCommDto` and stores it. That links the final version to its draft. Per migrations.md, a nullable column is fine.
- `DbSet<StandupGeneration>` in `AppDbContext` with an index on `Date`, plus migration `AddStandupGenerationsTable`.

### 2. Thread the id through (web)
- `StandupPlanningModal.vue` and `CommandModal.vue`: keep the `generationId` from the generate response and send it on save. Regenerating replaces it, so the *last* draft before save is the one that gets linked.

### 3. Export for review
- `GET /api/standup/feedback-pairs?from=&to=` returns `[{ date, promptVariant, userMessage, generatedMarkdown, submittedMarkdown }]`, joined via `GenerationId`.
- To review, dump that to JSON and hand it to Claude: "categorize my edits across these pairs and propose prompt/context-builder changes." That's the actual tuning loop.

### 4. Feature flag: `Features:StandupFeedbackCapture`
- Add `"Features": { "StandupFeedbackCapture": true }` to `api/src/appsettings.json`. Default it to `true` for the trial. Flipping it to `false` ends the trial with no code change.
- Read it inline with `IConfiguration`, the same way [ForecastEndpoints.cs:79](api/src/Endpoints/ForecastEndpoints.cs:79) does. No Options class, per api.md:
  `var captureEnabled = config.GetValue<bool>("Features:StandupFeedbackCapture");`
- Behavior when the flag is **off**:
  - `/generate` skips the insert and returns `generationId: null`. The response shape doesn't change otherwise.
  - `POST /api/standup` ignores any `generationId` it receives.
  - `GET /api/standup/feedback-pairs` returns `404`, so the export route disappears too.
- The web side needs no flag. It only sends `generationId` when the response included one, so it behaves correctly either way.
- The schema stays put when the flag is off: the table and the nullable column remain and are harmless. If the trial ends for good, a later `DropStandupGenerationsTable` migration cleans it up. That cleanup is separate work.
- Tests: add a test that sets the flag to `false` and checks that `/generate` creates no row and that the export returns 404. Override the setting through `WithWebHostBuilder(b => b.UseSetting("Features:StandupFeedbackCapture", "false"))` on the factory inside that test. That's a per-test override, so `CustomWebApplicationFactory` itself stays unmodified.

### 5. `/export-feedback` slash command
- New file `.claude/commands/export-feedback.md`, in the same style as [migration-review.md](.claude/commands/migration-review.md).
- Step 1: Ask for the date range with AskUserQuestion. Options: "Last 2 weeks", "Last 4 weeks", "This month", and Other for a custom `from`/`to`. If `$ARGUMENTS` already holds two dates, use those and skip the question.
- Step 2: Find the API URL from the Aspire dashboard or ask for it. The app must be running. Then call `GET {api}/api/standup/feedback-pairs?from=YYYY-MM-DD&to=YYYY-MM-DD`. A 404 means the flag is off: say so and stop.
- Step 3: Write the result to `feedback/standup-pairs-<from>_<to>.json` and add `feedback/` to `.gitignore`. Report how many pairs were exported and how many had edits (draft ≠ submitted).
- Step 4 (optional, asked): run the analysis on the exported file. Categorize the edits, name the top 3 recurring patterns, and propose concrete changes to `StandupPrompts.cs` or `StandupContextBuilder.cs`, with few-shot candidates drawn from the best submitted versions. The command only reports and proposes. It never edits the prompt.
- Add `/export-feedback` to the Slash Commands list in `CLAUDE.md`.

### Out of scope for now
- An in-app diff viewer, thumbs up/down, and automated eval scoring. The pair export covers the need. Add those only if reviewing JSON gets tedious.

## Implementation notes (2026-10-07)

- **Pre-existing bug fixed along the way:** both modals rendered the draft into a `contenteditable` area, but `handleSave` rebuilt markdown from the `sections` ref. Nothing synced in-place edits into that ref, so Save always stored the original model draft. (`[copy all]` reads the DOM, which hid the problem.) Without a fix, every captured pair would have had draft == submitted. Now `readEditedSections` in `web/src/utils/standupMarkdown.ts` reads each `[data-section-answer]` element back to markdown before saving: `<strong>`/`<b>` become `**bold**`, and `<br>`/`<div>` become newlines. It reads only answer elements, so `[cp]` button text stays out of the saved markdown.
- `PromptVariant` is stored as `{monday|midweek|friday|weekly}-{StandupPrompts.PromptVersion}`. Bump `PromptVersion` (currently `v1`) whenever the prompt wording changes.
- Re-saving a standup without a `generationId` (e.g. after reopening a saved entry) keeps the existing link. Only a new generation replaces it.
- An unknown `generationId` on save is ignored with a warning log. The save still succeeds.
- **In-app `/export-feedback`:** a slash-menu item (`SlashCommandMenu.vue`) shown only on the current Week view. It opens `ExportFeedbackModal.vue`, which has range presets (last 2 weeks, last 4 weeks, this month) plus a custom from/to. It shows a summary (total, edited, per-variant counts) and downloads `standup-pairs-<from>_<to>.json`. A 404 shows a "capture is off" message. Analysis stays in the Claude Code `/export-feedback` command.

## Caveat to confirm
"Submitted" here means what you **save in the modal**. If you usually tweak the text again inside Geekbot after saving, those final edits won't be captured. The fix is a habit: make your edits in the modal before saving.

## Critical files
- [api/src/Endpoints/StandupEndpoints.cs](api/src/Endpoints/StandupEndpoints.cs): `/generate` persists the row, `POST /` links it, new export route
- [api/src/Entities/UpdateComm.cs](api/src/Entities/UpdateComm.cs): `GenerationId`
- `api/src/Entities/StandupGeneration.cs` (new), `api/src/Data/AppDbContext.cs`, new migration
- `api/src/Dtos/` (`SaveUpdateCommDto` gains `GenerationId?`)
- `plans/standup-feedback-capture/plan.md` (copy of this plan)
- `api/src/appsettings.json` (feature flag), `.claude/commands/export-feedback.md` (new), `CLAUDE.md`, `.gitignore`
- [web/src/components/StandupPlanningModal.vue](web/src/components/StandupPlanningModal.vue), [web/src/components/CommandModal.vue](web/src/components/CommandModal.vue), plus their specs

## Verification
- xUnit: `/generate` creates a `StandupGeneration` (mock `IChatCompletionService` via NSubstitute). Saving with `generationId` links it. The export returns the joined pair. Saving without `generationId` still works.
- Vitest: the modals send `generationId` on save after generating, and send none when no generation happened.
- `/migration-review` on the new migration. Run `./scripts/backup-db.ps1` first.
- Manual: run Aspire, generate, edit, save, then hit `/api/standup/feedback-pairs` and confirm the draft and final versions differ as expected.
