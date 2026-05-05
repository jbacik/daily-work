# /create-adr

Create an Architecture Decision Record (ADR) from the current session context. Use this when a decision has been made that is hard to reverse, would surprise a future reader, or represents a genuine trade-off between real alternatives.

Do NOT create an ADR for obvious choices, stylistic preferences, or decisions that are easily changed.

## Step 1 — Identify the decision

If $ARGUMENTS is non-empty, treat it as the decision title or topic.

Otherwise, look at the current conversation for a decision that meets all three criteria:
- **Hard to reverse** — undoing it would require significant rework
- **Non-obvious** — a future reader would wonder why this choice was made
- **Genuine trade-off** — real alternatives were considered and rejected for reasons

If no such decision exists in the current context, tell the user and stop.

## Step 2 — Auto-number the ADR

List the files in `docs/decision-records/` and find the highest existing ADR number. The new ADR number is that + 1, zero-padded to four digits (e.g. `ADR-0001`, `ADR-0002`).

If no ADRs exist yet, start at `ADR-0001`.

## Step 3 — Draft the ADR

Fill in the template below from the current conversation context. Do not invent details — only record what was actually decided and discussed.

```
# ADR-NNNN: {Title}

**Date:** {today's date}
**Status:** Accepted

## Context

{What situation or problem forced this decision?}

## Decision

{What was decided? One clear statement.}

## Considered Alternatives

{What else was on the table and why was it not chosen?}

## Consequences

{What does this mean going forward — benefits and trade-offs accepted?}
```

## Step 4 — Confirm with the user

Show the draft and ask: "Save this as `docs/decision-records/ADR-NNNN-{kebab-title}.md`?"

Do not write the file until confirmed.

## Step 5 — Write the file

Save to `docs/decision-records/ADR-NNNN-{kebab-title}.md` using the confirmed content.

## Proactive use

After a `/grill-me` or `/write-a-prd` session, scan the decisions made and suggest running `/create-adr` for any that meet the three criteria above.
