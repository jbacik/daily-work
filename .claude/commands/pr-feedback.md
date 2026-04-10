# .claude/commands/pr-feedback.md



Determine the PR number to review:

- If a PR number was provided via arguments: $ARGUMENTS — use that directly

- Otherwise, run `gh pr view --json number --jq '.number'` to get the current branch's open PR



Then use `gh` CLI to:

1. Fetch all formal PR reviews on that PR

2. Filter to the most recent Copilot review

3. Fetch all line-level and summary review comments



Triage each piece of feedback into:

- **Address Now** – correctness, security, bugs, breaking changes

- **Backlog** – valid but non-blocking improvements  

- **Ignore** – stylistic, overly opinionated, out of scope for this PR



Flag these with extra urgency:

- Security issues (auth, secrets, input validation)

- Azure SDK misuse or anti-patterns

- EF Core / database performance concerns

- TypeScript `any` usage or missing types in Vue components



Group by category, summarize "Address Now" items first, and ask which to tackle first.
