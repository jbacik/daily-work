# /write-a-prd

Synthesize design decisions — from a `/grill-me` session or any feature discussion — into a structured requirements document, submitted as a GitHub issue.

Do NOT re-interview the user. That is `/grill-me`'s job. Synthesize from the current conversation context.

## Step 1 — Gather context

If $ARGUMENTS is non-empty, treat it as the feature name.

Ask the user to share the output of their `/grill-me` session, or summarize the feature if they have not grilled yet. Wait for their response.

## Step 2 — Explore the codebase

Read the relevant source files to verify assertions from the discussion and understand current state:
- The endpoint file(s) the feature will touch or add
- The entity/DTO files involved
- The Vue components and Pinia stores involved

Note any gaps between what was decided in discussion and what the codebase currently has.

## Step 3 — Design the modules

Sketch the major pieces to build or modify, in terms of this project's vertical slice:
1. Entity / DB schema changes
2. DTO shapes (create, update, response)
3. Endpoint routes + business rules
4. Pinia store actions
5. Vue component states + interactions

Actively look for opportunities to extract deep modules — pieces with a small, stable interface that encapsulate significant behavior and can be tested in isolation.

Confirm this list with the user before writing the PRD. Check which modules they want tests written for.

## Step 4 — Write the PRD

Use this structure. Omit any section that has nothing real to say — no filler.

---

**Problem Statement**
The problem from the user's perspective.

**Solution**
The solution from the user's perspective.

**User Stories**
A numbered list. Each story: "As a [role], I want [feature], so that [benefit]."
Be thorough — cover all meaningful user-facing behaviors.

**Implementation Decisions**
The modules confirmed in Step 3. For each: what it is, how it will be structured, and any key constraints. Include schema changes, API contracts, and specific interactions.
Do NOT include file paths or code snippets — they go stale.

**Testing Decisions**
What makes a good test for this feature (behavior via public interface, not implementation details). Which modules will have tests. Reference similar existing tests in `api/tests/` or `web/src/` as prior art.

**Out of Scope**
Explicit exclusions. One line each, with a brief reason.

**Further Notes**
Any deferred ideas or open decisions that did not block writing the PRD.

---

## Step 5 — Submit as a GitHub issue

Submit the PRD as a GitHub issue on `jbacik/daily-work` using the available GitHub MCP tools:
- Title: `prd: {feature name}` (lowercase)
- Body: the full PRD markdown from Step 4
- Label: `prd` if the label exists on the repo

Return the issue URL to the user.

## Step 6 — Offer to save locally

Ask: "Also save this to `docs/prd-{kebab-name}.md`?"
If yes, write the file.
