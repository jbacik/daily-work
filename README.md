# Daily Work

A personal productivity tool for planning and communicating daily and weekly work. Combines task management, a learning queue, and AI-generated standup reports into a single terminal-aesthetic interface.

## What It Does

- **Task tracking** — organize work into a weekly priority ("Big Thing") and up to five daily tasks ("Small Things") per day
- **Learning queue** — track articles, videos, experiments, and other learning resources; flag items worth sharing with the team
- **AI standup generation** — type `/standup` or `/weekly` to generate a draft standup or weekly update from your completed work, powered by Azure OpenAI
- **Scratch pad** — ephemeral per-day notes
- **Week-at-a-glance** — see all five days side by side with task completion status

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vue 3 (Composition API, `<script setup>`) + TypeScript |
| State | Pinia |
| Styling | Tailwind CSS v4 |
| Build | Vite |
| Backend | ASP.NET Core 10 Minimal APIs |
| Database | PostgreSQL (EF Core 10 / Npgsql) |
| AI | Microsoft Semantic Kernel + Azure OpenAI |
| Orchestration | .NET Aspire |
| Testing (API) | xUnit + Testcontainers (real PostgreSQL) |
| Testing (Web) | Vitest + Vue Test Utils |

## Getting Started

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js](https://nodejs.org/) (v20+)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — Aspire uses it to run PostgreSQL locally
- [.NET Aspire workload](https://learn.microsoft.com/en-us/dotnet/aspire/fundamentals/setup-tooling):
  ```
  dotnet workload install aspire
  ```

### Run Locally

1. **Clone the repo and install frontend dependencies**
   ```
   git clone https://github.com/jbacik/daily-work.git
   cd daily-work
   cd web && npm install && cd ..
   ```

2. **Start the app**
   ```
   dotnet run --project aspire/DailyWork.AppHost
   ```

   Aspire starts a PostgreSQL container, applies EF Core migrations automatically, launches the API, and starts the Vite dev server. Open the Aspire dashboard URL printed to the console to find service endpoints and logs.

3. **Open the app**

   The frontend URL is listed in the Aspire dashboard (typically `http://localhost:5173`).

### Azure OpenAI (Strongly Recommended)

Azure OpenAI powers the `/standup` and `/weekly` AI generation commands — the most useful part of the tool for daily communication. Without it the app runs, but those commands return a 503.

Set the following in `api/src/appsettings.Development.json`:

```json
{
  "AzureOpenAI": {
    "Endpoint": "https://<your-resource>.openai.azure.com/",
    "DeploymentName": "<your-deployment>",
    "ApiKey": "<your-key>"
  }
}
```

If `ApiKey` is omitted, `DefaultAzureCredential` is used (suitable for managed identity or `az login`).

## Project Structure

```
daily-work/
├── api/
│   ├── src/          # ASP.NET Core API (endpoints, entities, migrations)
│   └── tests/        # xUnit integration tests (Testcontainers)
├── web/
│   └── src/
│       ├── components/   # Vue SFCs
│       ├── stores/       # Pinia stores
│       ├── types/        # Shared TypeScript interfaces
│       └── utils/        # Week/date helpers
├── aspire/
│   ├── DailyWork.AppHost/          # Orchestration entry point
│   └── DailyWork.ServiceDefaults/  # Shared observability config
└── .claude/
    └── rules/        # Project conventions for AI-assisted development
```

## Running Tests

**API** (requires Docker for Testcontainers):
```
cd api/tests && dotnet test
```

**Web:**
```
cd web && npm run test
```

## Contributing

This project uses [Claude Code](https://claude.ai/code) as the primary development workflow.

### Preferred Workflow

1. Describe the feature or bug to Claude Code in the terminal
2. Review the generated plan before implementation begins
3. Let Claude implement, then **manually test** the change in the running Aspire environment
4. Run both test suites (API and web) before opening a PR
5. Open a PR — GitHub Copilot is configured to auto-review
6. Address any feedback, then merge

### Conventions

All project conventions are documented in `.claude/rules/`:

| File | Covers |
|---|---|
| `commits.md` | Branch names, commit messages, PR titles (Conventional Commits) |
| `api.md` | Endpoint structure, DTO patterns, EF Core usage, logging |
| `vue.md` | Component structure, Pinia stores, Tailwind tokens |
| `vue-testing.md` | Vitest + Vue Test Utils patterns |
| `testing.md` | xUnit integration test patterns |
| `migrations.md` | EF Core migration conventions |

## What's Missing

### Foundational

- **CI pipeline** — no GitHub Actions workflows exist; tests are run manually before PRs
- **E2E tests** — no browser-level tests (Playwright or similar); the app is tested via API integration tests and Vue unit tests only
- **Deployment** — the app runs locally via Aspire only; there is no Docker Compose or cloud deployment setup ([issue #2](https://github.com/jbacik/daily-work/issues/2))

### Enhancements

See open [enhancement issues](https://github.com/jbacik/daily-work/issues?q=is%3Aopen+label%3Aenhancement) for the full backlog. Current items:

| # | Description |
|---|---|
| [#1](https://github.com/jbacik/daily-work/issues/1) | Automate weekly Lattice update |
| [#2](https://github.com/jbacik/daily-work/issues/2) | Docker deployment for running without Visual Studio / Aspire |
| [#3](https://github.com/jbacik/daily-work/issues/3) | Start new week button |
| [#4](https://github.com/jbacik/daily-work/issues/4) | Carry over last Friday's tasks to next Monday |
| [#17](https://github.com/jbacik/daily-work/issues/17) | Achievements log |
| [#39](https://github.com/jbacik/daily-work/issues/39) | Mobile layout optimization |
| [#40](https://github.com/jbacik/daily-work/issues/40) | Learning queue search and filtering |
