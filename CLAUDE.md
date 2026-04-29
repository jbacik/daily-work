# Daily Work — Claude Code Instructions

Personal productivity tool: daily/weekly task tracking, learning queue, and AI-generated standup reports. Single-user, local-first.

## Running the App

```
dotnet run --project aspire/DailyWork.AppHost
```

Aspire starts PostgreSQL (Docker), applies EF migrations, launches the API, and starts the Vite dev server. Frontend URL is in the Aspire dashboard (typically `http://localhost:5173`).

## Running Tests

```
cd api/tests && dotnet test        # xUnit + Testcontainers (requires Docker)
cd web && npm run test             # Vitest + Vue Test Utils
```

Always run both test suites before opening a PR.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vue 3 (`<script setup>`) + TypeScript + Pinia + Tailwind v4 |
| Backend | ASP.NET Core 10 Minimal APIs |
| Database | PostgreSQL via EF Core 10 |
| AI | Microsoft Semantic Kernel + Azure OpenAI |
| Orchestration | .NET Aspire |

## Project Layout

```
api/src/          # Endpoints, Entities, Dtos, Enums, Migrations
api/tests/        # xUnit integration tests
web/src/          # Vue components, Pinia stores, types, utils
aspire/           # .NET Aspire AppHost and ServiceDefaults
.claude/rules/    # Coding conventions (read these before making changes)
```

## Ubiquitous Language

`Ubiquitous_Language.md` at the project root defines the canonical vocabulary for this codebase — domain terms, technical conventions, and naming patterns. Read it before planning or implementing any feature. Use `/ubiquitous-language` to add new terms as they emerge.

## Coding Conventions

All conventions live in `.claude/rules/`. Read the relevant file before touching that layer:

- `api.md` — endpoint structure, DTO/entity patterns, EF Core, logging
- `vue.md` — component structure, Pinia stores, Tailwind tokens, API call pattern
- `vue-testing.md` — Vitest + Vue Test Utils patterns
- `testing.md` — xUnit integration test patterns
- `migrations.md` — EF Core migration conventions
- `commits.md` — branch names, commit messages, PR titles (Conventional Commits)

## Development Workflow

1. **Implement** — features typically touch both `api` and `web` in the same branch/PR
2. **Test** — write API integration tests (xUnit + Testcontainers) and Vue component tests (Vitest) alongside every feature
3. **Migrate** — when schema changes, add an EF Core migration from `api/src/` and verify `Up()`/`Down()`
4. **Format** — run `dotnet format api/src` and `dotnet format api/tests`; commit any changes before pushing
5. **Lint** — run `npm run lint` from `web/`; fix all errors and warnings before pushing
6. **PR** — open a PR; GitHub Copilot will auto-review
7. **Triage feedback** — use `/pr-feedback` to triage Copilot review comments into Address Now / Backlog / Ignore
8. **Manual test** — always verify the running Aspire app before merging

## Slash Commands

- `/grill-me` — Socratic design interview before implementation; surfaces assumptions and gaps
- `/write-a-prd` — synthesize design decisions into a structured PRD, submitted as a GitHub issue
- `/test-plan` — enumerate all xUnit + Vitest test cases before writing any test code
- `/migration-review` — verify a scaffolded EF Core migration before committing
- `/ubiquitous-language` — add or correct terms in `Ubiquitous_Language.md`
- `/pr-feedback` — triage the latest Copilot review on the current PR

## Key Constraints

- Max 5 SmallThing tasks per day, enforced in the POST handler (not a validation library)
- Max 1 BigThing per week (one weekly priority)
- Azure OpenAI is optional — if not configured, `/standup` and `/weekly` generate commands return 503; all other features work normally
- Never merge autonomously — see `commits.md` for merging rules
