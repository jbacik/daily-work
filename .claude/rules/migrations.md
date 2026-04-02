---
apply: "api/**"
---

# EF Core / SQLite Migration Conventions

## Creating a Migration

Run from `api/src/`:

```
dotnet ef migrations add <MigrationName> --project . --startup-project .
```

Names are PascalCase describing the schema change:

- `AddScratchPadTable`
- `AddTypeColumnToReadWatchItems`
- `AddIndexOnWorkItemsDate`

Never use `Update1`, `Fix`, `Temp`, or other vague names.

## Reviewing Migration Output

After generating a migration, open the scaffolded `.cs` file and verify:

1. `Up()` does exactly what you expect
2. `Down()` cleanly reverses it
3. No unintended columns or tables appeared

Never manually edit `AppDbContextModelSnapshot.cs`.

## SQLite Constraints

SQLite does not support `ALTER COLUMN` or `DROP COLUMN`. When changing an existing column's type or nullability, EF Core's SQLite provider scaffolds a table rebuild automatically — trust the generated output, don't manually rewrite it.

## Adding Columns to Existing Tables

When adding a non-nullable column to a table that may already have rows, either:

- Make the property nullable (`string?`, `bool?`) on the entity, or
- Provide a `defaultValue` in the `AddColumn` call in the migration

For this dev tool, nullable is preferred — data loss on schema change is acceptable.

## Auto-Migration on Startup

`Program.cs` calls `db.Database.Migrate()` at startup, which applies all pending migrations to `dailywork.db` automatically. The test factory does the same against in-memory SQLite. Never replace `Migrate()` with `EnsureCreated()` — it bypasses the migration system.

## `OnModelCreating` Conventions

Configure all mappings in `AppDbContext.OnModelCreating` — no separate `IEntityTypeConfiguration<T>` classes (overkill for this app size).

- Enums are stored as integers by default — no `HasConversion<string>()` needed
- Add `.HasIndex()` for columns used in `Where` filters in endpoint queries

```csharp
modelBuilder.Entity<WorkItem>()
    .HasIndex(w => new { w.Date, w.Category });
```

## DbSet Convention

Use expression-bodied getters (not `{ get; set; }`):

```csharp
public DbSet<WorkItem> WorkItems => Set<WorkItem>();
public DbSet<ReadWatchItem> ReadWatchItems => Set<ReadWatchItem>();
```
