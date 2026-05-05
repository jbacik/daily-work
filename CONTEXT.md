# CONTEXT.md

Shared reference for the Daily Work app — defines what things are called, how they behave, and how the codebase is structured. Read this before planning or implementing anything. Use `/update-context` to add new terms as they emerge.

---

## Domain Terms

| Term | Definition | Code Name | UI Label | Gotchas |
|---|---|---|---|---|
| **WorkItem** | A single task assigned to a specific calendar day | `WorkItem` entity, `WorkItem` TS interface | Task / Item | Has both a `Date` (the day) and a `WeekOf` (the Monday of that week) |
| **BigThing** | The single weekly priority — one allowed per week | `WorkItemCategory.BigThing` (value 1) | Big Thing | Max 1 per week enforced server-side; promoting a new BigThing demotes the old one |
| **SmallThing** | A daily task — up to 5 per day | `WorkItemCategory.SmallThing` (value 2) | Small Thing | Max 5 per day enforced server-side; returns 422 if exceeded |
| **WeekOf** | The Monday date that identifies a calendar week | `WeekOf` (`string` `YYYY-MM-DD`) | Week of [date] | Always a Monday — never inferred without calculating; stored as ISO date string, not a DateTime |
| **Date** | The specific calendar day a WorkItem belongs to | `Date` (`DateOnly` in C#, `string` `YYYY-MM-DD` in TS) | [date] | Distinct from `WeekOf`; a WorkItem always has both |
| **SortOrder** | Integer position of a WorkItem within its Date + Category group | `SortOrder` (int, default 0) | (drag position) | Scoped to Date + Category — not global; recalculated on promote/move operations |
| **ReadWatchItem** | An item in the learning queue: article, video, course, or experiment | `ReadWatchItem` entity, `ReadWatchItem` TS interface | Learning Queue item | `IsActive` and `IsDone` are separate states — active means in the current queue, done means consumed |
| **ReadWatchType** | The kind of learning content | `ReadWatchType` enum (`Read=1`, `Watch=2`, `Learn=3`, `Experiment=4`) | Read / Watch / Learn / Experiment | Stored as integer in DB; serialized as string on the API surface via `JsonStringEnumConverter` |
| **IsActive** | Whether a ReadWatchItem is in the current active learning queue | `IsActive` (bool, default true) | (active queue indicator) | Newly created items start active; deactivating removes from queue without deleting |
| **IsDone** | Whether a WorkItem or ReadWatchItem has been completed | `IsDone` (bool) | Checkbox / strikethrough | On ReadWatchItems, separate from `IsActive` — an item can be done but still active |
| **WorthSharing** | Nullable evaluation of whether a ReadWatchItem is worth recommending | `WorthSharing` (bool?) | Worth sharing? | `null` = not yet evaluated; `true` = share; `false` = don't share — never treat null as false |
| **WeekConsumed** | The Monday of the week when a ReadWatchItem was actually consumed | `WeekConsumed` (`DateOnly?` in C#, `string?` in TS) | Consumed week | Null until the item is marked done; always a Monday, like `WeekOf` |
| **ScratchPad** | Freeform text area for notes and drafts | `ScratchPad` entity | Scratch Pad | One active scratch pad at a time (`IsActive = true`); no server-side length limit |
| **Standup** | AI-generated daily standup report in markdown | `DailyStandupComm` / `CommType.DailyStandup` | Standup | Requires Azure OpenAI; returns 503 if not configured. Rolls back to Friday when generated on Monday |
| **WeeklyUpdate** | AI-generated weekly progress update | `WeeklyUpdateComm` / `CommType.WeeklyUpdate` | Weekly Update | Generated from the current week's WorkItems and ReadWatchItems |
| **WeeklySummary** | AI-generated reflective week evaluation | `WeeklySummaryComm` / `CommType.WeeklySummary` | Evaluate My Week | Reflective in tone — distinct from WeeklyUpdate which is a status report |
| **Comm** | Abstract base for any AI-generated communication | `UpdateComm` (abstract entity) | (not user-facing) | Never instantiated directly; always one of the three concrete subtypes |

---

## Technical Conventions

| Term | Meaning | Example / Where Used |
|---|---|---|
| **Store** | A Pinia setup store (`defineStore('id', () => {...})`) in `web/src/stores/` | `dailyTasksStore`, `readWatchStore` |
| **Endpoint file** | One `internal static class` per resource in `api/src/Endpoints/`, with a single `Map*Endpoints` extension method | `WorkItemEndpoints.cs`, `StandupEndpoints.cs` |
| **Handler** | The inline async lambda passed directly to `MapGet` / `MapPost` / etc. — never a separate class | `group.MapPost("/", async (AppDbContext db, ...) => { ... })` |
| **Entity** | A C# class in `api/src/Entities/` mapped to a PostgreSQL table via EF Core | `WorkItem`, `ReadWatchItem`, `ScratchPad` |
| **DTO** | A C# `record` in `api/src/Dtos/` used as the request body shape; never used as a response | `CreateWorkItemDto`, `UpdateReadWatchItemDto` |
| **client** | The Axios instance at `@/api/client.ts` — has a response interceptor that returns `response.data` directly | `await client.get('/api/work-items')` returns the array, not `{ data: [...] }` |
| **JsonOptions** | The static `JsonSerializerOptions` in every xUnit test class; must include `JsonStringEnumConverter` | `ReadFromJsonAsync<WorkItem>(JsonOptions)` |
| **Tracer bullet** | The single most critical test that proves an end-to-end path works; written first in a TDD cycle | First test identified in `/test-plan` output |
| **Vertical slice** | A feature change that touches every layer together: entity → DTO → endpoint → store → component → tests | How all features in this app are built |
| **Deep module** | A piece with a small, stable interface that encapsulates significant behavior and can be tested in isolation | Identified during the `/write-a-prd` module design step |
| **WeekOf string** | A Monday date in `YYYY-MM-DD` format — the canonical identifier for a week across the whole system | `weekOf: '2026-04-28'` |
| **internal** | Default C# visibility for all types (entities, DTOs, endpoints, enums) — `public` only when crossing assembly boundaries | All types except `IApiMarker` |
| **Results.\*** | Return type convention for Minimal API handlers — never `TypedResults` | `Results.Ok()`, `Results.Created()`, `Results.NotFound()` |
| **Respawn** | The test isolation mechanism that truncates all DB tables before each test class runs | `_factory.ResetDatabaseAsync()` in `InitializeAsync()` |

---

## Naming Patterns

| Pattern | Rule | Example |
|---|---|---|
| xUnit test method | `Route_Description_WhenCondition` — three parts, no `Should_` prefix | `PostWorkItem_Returns422_WhenDailyLimitExceeded` |
| Vitest test name | `Subject_Description_WhenCondition` — three parts, no `Should_` prefix | `WorkItemList_ShowsEmptyState_WhenNoItems` |
| Migration name | PascalCase describing the schema change — never vague names | `AddSortOrderToWorkItems`, never `Update1` or `Fix` |
| Commit message | `type(scope): description` — imperative, lowercase, no trailing period | `feat(api): add scratch pad endpoint` |
| Branch name | `type/short-kebab-description` | `feat/scratch-pad-endpoint` |
