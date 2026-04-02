---
apply: "api/**"
---

# .NET API Conventions

## Endpoint File Structure

One file per resource in `api/src/Endpoints/` named `{Resource}Endpoints.cs`. A single `internal static class` with one extension method that groups all routes:

```csharp
internal static class WorkItemEndpoints
{
    public static RouteGroupBuilder MapWorkItemEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/work-items");
        // ... map routes on group
        return group;
    }
}
```

Register in `Program.cs` via `app.MapWorkItemEndpoints()`.

## Handler Style

Handlers are inline async lambdas on the Map calls — no separate handler classes.

```csharp
group.MapPost("/", async (AppDbContext db, ILogger<WorkItemEndpoints> logger, CreateWorkItemDto dto) =>
{
    // ...
    return Results.Created($"/api/work-items/{item.Id}", item);
});
```

Return `Results.Ok()`, `Results.Created()`, `Results.NotFound()`, `Results.NoContent()`, `Results.Problem()` — not `TypedResults`.

## EF Core Patterns

- `db.Entity.FindAsync(id)` for single-by-PK lookups (not `FirstOrDefaultAsync`)
- `db.Entity.Where(...).ToListAsync()` for filtered lists
- Always `await db.SaveChangesAsync()` after mutations
- No `AsNoTracking()` (operations are simple and short-lived)

## Entity Conventions

Entities in `api/src/Entities/`. Keep them flat — no base class.

```csharp
internal class WorkItem
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public WorkItemCategory Category { get; set; }
    public bool IsDone { get; set; }
    public DateTime Date { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
```

## DTO Conventions

DTOs in `api/src/Dtos/` as `record` types. Positional records for create, `record` with `init` properties for update (nullable for partial updates):

```csharp
internal record CreateWorkItemDto(string Title, string? Category, DateTime? Date);

internal record UpdateWorkItemDto
{
    public string? Title { get; init; }
    public bool? IsDone { get; init; }
}
```

Endpoint checks `if (dto.Prop is not null)` before applying each field. No separate Response DTOs — entities are returned directly.

## Enum Conventions

Enums in `api/src/Enums/`. Every member **must** have an explicit integer value assigned — no implicit ordering. Values start at 1 (reserve 0 as unset/unknown):

```csharp
internal enum WorkItemCategory
{
    BigThing = 1,
    SmallThing = 2,
}
```

- Stored as **integers** in SQLite (EF Core default — do not add `HasConversion<string>()`)
- The global `JsonStringEnumConverter` in `Program.cs` handles string↔int for the API surface
- Parse from DTO strings: `Enum.TryParse<TEnum>(dto.Value, out var val) ? val : DefaultValue`

## Visibility: `internal` by Default

Prefer `internal` over `public` for all types (entities, DTOs, endpoint classes, enums). Expose internals to the test project via:

```csharp
// In api/src/ — AssemblyInfo.cs or top of Program.cs
[assembly: InternalsVisibleTo("DailyWork.Api.Tests")]
```

Only mark types `public` when they need to cross assembly boundaries.

## Logging

Inject `ILogger<T>` as a DI parameter in handler lambdas. Use structured logging with named placeholders — no string interpolation:

```csharp
// CORRECT
logger.LogInformation("Created work item {Id} for date {Date}", item.Id, item.Date);

// WRONG
logger.LogInformation($"Created work item {item.Id} for date {item.Date}");
```

Log levels: `Information` for successful mutations, `Warning` for business rule violations, `Error` for unexpected failures.

## C# Style

- Use `[]` collection expression syntax (C# 12+) where applicable
- Use `var` for locals where the type is obvious from the right side

## Keep It Simple

This is an intentionally minimal dev tool. No FluentValidation, no auth middleware, no output caching, no Options pattern. Business rule validation (e.g., max 5 items/day) is inline in the endpoint handler:

```csharp
var count = await db.ReadWatchItems.CountAsync(r => r.Date == date);
if (count >= 5)
    return Results.Problem("Maximum 5 items per day", statusCode: 422);
```
