# /update-context

Read and update `CONTEXT.md` when new terms emerge during planning or implementation that are not yet defined.

## Step 1 — Read the current context

Read `CONTEXT.md` in full.

## Step 2 — Identify gaps or drift

Look for terms in the current conversation, a PRD, or a feature branch that either:
- Do not appear in `CONTEXT.md` at all
- Are used inconsistently with an existing definition
- Have a definition that no longer matches the codebase

## Step 3 — Draft additions or corrections

For each new or drifted term, draft the table row(s) to add or update:

**Domain term:**
| Term | Definition | Code Name | UI Label | Gotchas |

**Technical convention:**
| Term | Meaning | Example / Where Used |

**Naming pattern:**
| Pattern | Rule | Example |

Place each term in the correct section. Use existing rows as a guide for detail level and style.

## Step 4 — Confirm with the user

Present the proposed rows and ask: "Should I add these to `CONTEXT.md`?"

Do not write to the file until the user confirms.

## Step 5 — Update the file

Apply confirmed additions or corrections to the appropriate table. Preserve existing rows exactly — do not reformat or reorder unless asked.

## Proactive use

During `/grill-me` or `/write-a-prd` sessions, track any new terms being coined. Suggest running `/update-context` at the end if new vocabulary has emerged.
