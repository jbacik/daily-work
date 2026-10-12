# /export-feedback

Export captured standup feedback pairs (model draft vs. the markdown actually saved) for a date range, and optionally analyze the edits to propose prompt improvements.

Requires the `Features:StandupFeedbackCapture` flag to be `true` in `api/src/appsettings.json` and the Aspire app to be running.

## Step 1 — Resolve the date range

If $ARGUMENTS contains two dates (`yyyy-MM-dd yyyy-MM-dd`), use them as `from` and `to` and skip the question.

Otherwise ask with AskUserQuestion (header: "Date range"):
- **Last 2 weeks** — `from` = today − 14 days, `to` = today
- **Last 4 weeks** — `from` = today − 28 days, `to` = today
- **This month** — `from` = first day of the current month, `to` = today
- Other — the user types `from` and `to`

Compute concrete `yyyy-MM-dd` dates and state them back before calling the API.

## Step 2 — Call the API

The API port is allocated per Aspire run — find it in the Aspire dashboard (the `api` resource endpoint) or ask the user for the base URL. Then:

```
curl -s -w "\n%{http_code}" "{api}/api/standup/feedback-pairs?from={from}&to={to}"
```

- **404** → capture is turned off. Tell the user to set `Features:StandupFeedbackCapture` to `true` and restart the API, then stop.
- **400** → the date range was malformed; fix and retry once.
- Connection refused → the app isn't running; tell the user to start it (`dotnet run --project aspire/DailyWork.AppHost`) and stop.

## Step 3 — Save the export

Write the JSON response to `feedback/standup-pairs-{from}_{to}.json` (`feedback/` is gitignored).

Report in one short block:
- Total pairs exported
- Pairs where `generatedMarkdown` ≠ `submittedMarkdown` (i.e. you edited the draft)
- Breakdown by `promptVariant` (e.g. `midweek-v1: 6, friday-v1: 2`)

If there are 0 pairs, say so and stop — remind the user that pairs are only captured when a standup is generated and then saved from the modal.

## Step 4 — Analyze (optional)

Ask with AskUserQuestion whether to analyze the edits now. If yes, read the exported file and:

1. For each edited pair, diff `generatedMarkdown` vs `submittedMarkdown` and label each edit with a **category**, not an instance (e.g. "too wordy", "opener tone", "dropped carried item", "unwanted sync listed", "reworded task title").
2. Name the **top 3 recurring patterns** with counts and one short before/after example each.
3. Propose concrete changes, preferring this order:
   - **Few-shot examples** — pick 2–3 of the best `submittedMarkdown` entries as candidates to embed in the system prompt.
   - **Rule deletions** in `api/src/Prompts/StandupPrompts.cs` that examples would make redundant.
   - **Deterministic fixes** in `api/src/Prompts/StandupContextBuilder.cs` for edits that are always the same mechanical change.
   - Prompt wording changes last.
4. Remind the user to bump `StandupPrompts.PromptVersion` when they change the prompt, so later exports can be compared per version.

This command only reports and proposes — **never edit the prompt files or the database**.
