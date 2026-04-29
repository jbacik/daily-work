# /migration-review

Review a scaffolded EF Core migration for correctness and safety before committing.

## Step 1 — Locate the migration file

If $ARGUMENTS is provided, find the matching `.cs` file in `api/src/Migrations/` (partial name match is fine).

If $ARGUMENTS is empty, run:
```
ls -t api/src/Migrations/*.cs | grep -v AppDbContextModelSnapshot.cs | head -1
```
and use the result.

Read the migration file in full. Also read `api/src/AppDbContext.cs` to cross-reference indexes and entity configuration.

## Step 2 — Run each check

**Name**
PASS if PascalCase and describes the schema change (`AddScratchPadTable`, `AddTypeColumnToReadWatchItems`).
FLAG if vague: `Update1`, `Fix`, `Temp`, `Migration`, or anything non-descriptive.

**Up()**
Describe in plain English what `Up()` does. Then check:
- Does it match exactly what the migration name implies?
- For every `AddColumn` with `nullable: false` on a table that may have existing rows: is `defaultValue` provided, or is the entity property nullable?
- Are there any unintended columns, tables, or indexes that don't match a recent entity or `OnModelCreating` change?

**Down()**
- Does `Down()` reverse every operation in `Up()`, in reverse order?
- If `Up()` runs raw SQL, does `Down()` reverse it or acknowledge it cannot be reversed?

**Indexes**
- Every `CreateIndex` in `Up()`: is there a matching `.HasIndex()` in `OnModelCreating`?
- Every `DropIndex` in `Up()`: was the corresponding `.HasIndex()` also removed?

**Snapshot**
- Is `AppDbContextModelSnapshot.cs` present and updated? Flag if absent when columns or tables changed — it means the migration was not generated cleanly by EF tooling.

**Auto-migration safety**
- Would applying this to a database with existing rows cause data loss or a constraint violation? Flag with the specific risk if yes.

## Output format

Print PASS or FLAG at the top, then one bullet per check:

```
FLAG

- Name: PASS — `AddSortOrderToWorkItems` is descriptive
- Up(): FLAG — `SortOrder` is `nullable: false` with no `defaultValue`; existing rows will violate the constraint
- Down(): PASS — drops index then drops column, exact reversal
- Indexes: PASS — `IX_WorkItems_Date_Category_SortOrder` matches OnModelCreating
- Snapshot: PASS — AppDbContextModelSnapshot.cs present and updated
- Auto-migration safety: FLAG — same issue as Up(); add `defaultValue: 0` or make the property nullable
```

Keep bullets to one line each. Do not reprint migration code unless it directly clarifies a flag.
