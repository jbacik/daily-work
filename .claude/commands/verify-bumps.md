# Verify Bumps

Analyze a Dependabot dependency bump PR for this repo: summarize what changed, flag risks, and produce a concrete test plan.

## Step 1 — Resolve the PR number

The user may provide a bare PR number or a full GitHub URL (`https://github.com/jbacik/daily-work/pull/<N>`). Extract the PR number either way. The repo is always `jbacik/daily-work`.

## Step 2 — Gather PR data

Run these in parallel:

```bash
gh pr view $P --repo jbacik/daily-work \
  --json number,title,url,author,state,isDraft,additions,deletions,changedFiles,baseRefName,headRefName,body

gh pr diff $P --repo jbacik/daily-work
```

## Step 3 — Analyze the bump

From the PR body and diff, extract:

- **Package / action name** and **old → new version**
- **Bump type** — patch / minor / major, or SHA-pin update for GitHub Actions
- **Release notes** — Dependabot embeds the upstream changelog; summarize key points
- **Breaking changes** — renamed/removed APIs, changed defaults, major version increments
- **Security changes** — CVE fixes, hardening behavior
- **Behavioral changes** — things that work differently even without an API break

Cross-reference the diff to confirm what files changed and that the SHA/version matches the claimed tag.

**For GitHub Actions bumps** (the most common type in this repo): check what triggers, inputs, and permissions `ci.yml` actually uses vs. what changed in the action — most concerns won't apply if the project doesn't use the affected feature.

## Step 4 — Build the test plan

Tailor the plan to the type of dependency:

| Type | Primary verification |
|---|---|
| CI action (e.g. `actions/checkout`, `actions/setup-dotnet`) | CI passing on this PR; note manual checks if the action touches secrets, artifacts, or permissions |
| .NET NuGet package | Check how it's used in `api/`; flag any changed API or behavior on a critical path |
| npm package | Check how it's used in `web/`; watch for new lint warnings or build failures |
| Security fix | Note the CVE; confirm the vulnerable code path is used in this project |

For major version bumps always scan the full release notes — not just what Dependabot highlights.

## Step 5 — Report

```markdown
## PR #<N> — <title>
jbacik/daily-work · <state> · +<additions>/-<deletions> across <changedFiles> files · <url>

### What changed
- **Package**: <name>
- **Version**: <old> → <new> (<patch|minor|major>)
- **Key changes**: <bullet summary of notable release notes>

### Risks & regressions
<bullet list — or "No regressions identified." if clean>
- **Breaking:** ...
- **Behavioral:** ...
- **Security:** ...

### Test plan
1. ...
2. ...

### Bottom line
<1–2 sentences: safe to merge as-is, or is something required first?>
```

Omit any risk category that has nothing to report. If the diff looks clean, say so plainly — don't manufacture concerns.
