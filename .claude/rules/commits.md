# Conventional Commits

## Commit Messages

Format: `type(scope): description`

- **type**: one of the allowed types below
- **scope**: optional, lowercase noun describing the area changed (e.g. `api`, `web`, `db`, `ci`)
- **description**: imperative, lowercase, no trailing period — "add endpoint" not "Added endpoint."

```
feat(api): add scratch pad endpoint
fix(web): correct date offset in work item form
chore: update dependencies
```

### Allowed Types

| Type | When to use |
|---|---|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `chore` | Maintenance, dependency updates, config changes |
| `docs` | Documentation only |
| `refactor` | Code restructuring with no behavior change |
| `test` | Adding or updating tests |
| `build` | Build system or tooling changes |
| `ci` | CI/CD pipeline changes |
| `perf` | Performance improvement |
| `style` | Formatting, whitespace — no logic change |

### Body and Footer (optional)

Add a blank line after the subject, then a body for context if needed. Use `BREAKING CHANGE:` footer for breaking changes.

```
feat(api): add scratch pad endpoint

Stores freeform text per day. No length limit enforced server-side.

BREAKING CHANGE: removed /api/notes in favor of /api/scratch-pad
```

## Branch Names

Format: `type/short-kebab-description`

- Use the same type vocabulary as commit messages
- Keep descriptions short (2–4 words)
- All lowercase, hyphens only — no underscores or slashes beyond the type separator

```
feat/scratch-pad-endpoint
fix/login-redirect
chore/pin-axios
test/work-item-integration
```

## PR Titles

Same format as the commit subject line: `type(scope): description`

```
feat(api): add scratch pad endpoint
fix(web): correct date offset in work item form
chore: pin axios to 1.14.0
```

## Merging Rules

- **Never merge a branch autonomously.** Do not run `git merge`, `git rebase` onto another branch, or merge a PR without being explicitly asked.
- The only merge operation to perform without extra prompting is pulling `main` into a feature branch — and only when the user explicitly asks for it (`git merge main` or `git rebase main` from the feature branch).
- Never merge a feature branch into `main`, squash-merge, or close a PR via CLI unless directly instructed.

## Consistency Rule

Branch name, commit message, and PR title should all reflect the same type and scope:

| Surface | Example |
|---|---|
| Branch | `feat/scratch-pad-endpoint` |
| Commit | `feat(api): add scratch pad endpoint` |
| PR title | `feat(api): add scratch pad endpoint` |
