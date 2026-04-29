# /ubiquitous-language

Read and update the project's shared vocabulary in `Ubiquitous_Language.md`. Use this skill when new terms emerge during planning or implementation that are not yet in the file.

## Step 1 — Read the current vocabulary

Read `Ubiquitous_Language.md` in full to understand what is already defined.

## Step 2 — Identify new or drifted terms

Look for terms in the current conversation, a PRD, or a feature branch that either:
- Do not appear in `Ubiquitous_Language.md` at all
- Are used inconsistently with the existing definition
- Have a definition that no longer matches the codebase

## Step 3 — Propose additions or corrections

For each new or drifted term, draft the table row(s) to add or update:

**Domain/Business term:**
| Term | Definition | Code Name | UI Label | Gotchas |

**Technical convention:**
| Term | Meaning | Example / Where Used |

**Naming pattern:**
| Pattern | Rule | Example |

Place the term in the correct section. Use the existing rows as style and detail level guides.

## Step 4 — Confirm with the user

Present the proposed rows and ask: "Should I add these to `Ubiquitous_Language.md`?"

Do not write to the file until the user confirms.

## Step 5 — Update the file

Apply confirmed additions or corrections to the appropriate table in `Ubiquitous_Language.md`. Preserve existing rows exactly — do not reformat or reorder unless the user asks.

## When to invoke this skill proactively

When working on a `/write-a-prd` or `/grill-me` session, pay attention to terms being used and suggest running `/ubiquitous-language` at the end if new vocabulary has emerged.
