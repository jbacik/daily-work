using DailyWork.Api;
using DailyWork.Api.Data;
using DailyWork.Api.Dtos;
using DailyWork.Api.Entities;
using DailyWork.Api.Enums;
using Microsoft.EntityFrameworkCore;

namespace DailyWork.Api.Endpoints;

internal static partial class WorkMetricEndpoints
{
	[LoggerMessage(Level = LogLevel.Warning, Message = "Rejected duplicate work metric definition {Title}")]
	private static partial void LogDuplicateDefinition(ILogger logger, string title);

	[LoggerMessage(Level = LogLevel.Information, Message = "Created work metric definition {Id} {Title}")]
	private static partial void LogDefinitionCreated(ILogger logger, int id, string title);

	[LoggerMessage(Level = LogLevel.Warning, Message = "Rejected rename of work metric definition {Id} to duplicate title {Title}")]
	private static partial void LogDefinitionRenameConflict(ILogger logger, int id, string title);

	[LoggerMessage(Level = LogLevel.Information, Message = "Updated work metric definition {Id}")]
	private static partial void LogDefinitionUpdated(ILogger logger, int id);

	[LoggerMessage(Level = LogLevel.Information, Message = "Deleted work metric definition {Id}")]
	private static partial void LogDefinitionDeleted(ILogger logger, int id);

	[LoggerMessage(Level = LogLevel.Information, Message = "Agent upserted work metric entry {Id} for week {WeekOf} titled {Title}")]
	private static partial void LogEntryUpserted(ILogger logger, int id, string weekOf, string title);

	[LoggerMessage(Level = LogLevel.Warning, Message = "Rejected duplicate work metric entry {Title} for week {WeekOf}")]
	private static partial void LogDuplicateEntry(ILogger logger, string title, string weekOf);

	[LoggerMessage(Level = LogLevel.Information, Message = "Created ad-hoc work metric entry {Id} for week {WeekOf}")]
	private static partial void LogEntryCreated(ILogger logger, int id, string weekOf);

	[LoggerMessage(Level = LogLevel.Warning, Message = "Rejected rename of work metric entry {Id} to duplicate title {Title}")]
	private static partial void LogEntryRenameConflict(ILogger logger, int id, string title);

	[LoggerMessage(Level = LogLevel.Information, Message = "Updated work metric entry {Id}")]
	private static partial void LogEntryUpdated(ILogger logger, int id);

	[LoggerMessage(Level = LogLevel.Information, Message = "Deleted work metric entry {Id}")]
	private static partial void LogEntryDeleted(ILogger logger, int id);

	public static RouteGroupBuilder MapWorkMetricEndpoints(this WebApplication app)
	{
		var group = app.MapGroup("/api/work-metrics");

		// ---- definitions ------------------------------------------------

		group.MapGet("/definitions", async (AppDbContext db) =>
		{
			var definitions = await db.WorkMetricDefinitions
				.AsNoTracking()
				.Where(d => d.IsActive)
				.OrderBy(d => d.SortOrder)
				.ThenBy(d => d.CreatedAt)
				.ToListAsync();

			return Results.Ok(definitions);
		});

		group.MapGet("/definitions/all", async (AppDbContext db) =>
		{
			var definitions = await db.WorkMetricDefinitions
				.AsNoTracking()
				.OrderBy(d => d.SortOrder)
				.ThenBy(d => d.CreatedAt)
				.ToListAsync();

			return Results.Ok(definitions);
		});

		group.MapPost("/definitions", async (AppDbContext db, ILoggerFactory loggerFactory, CreateWorkMetricDefinitionDto dto) =>
		{
			var logger = loggerFactory.CreateLogger(nameof(WorkMetricEndpoints));

			var title = dto.Title?.Trim();
			if (string.IsNullOrEmpty(title))
				return Results.BadRequest("title is required.");

			if (await db.WorkMetricDefinitions.AnyAsync(d => d.Title == title))
			{
				LogDuplicateDefinition(logger, title);
				return Results.Problem("A definition with that title already exists.", statusCode: 422);
			}

			var nextSortOrder = await db.WorkMetricDefinitions.AnyAsync()
				? await db.WorkMetricDefinitions.MaxAsync(d => d.SortOrder) + 1
				: 1;

			var definition = new WorkMetricDefinition { Title = title, SortOrder = nextSortOrder };
			db.WorkMetricDefinitions.Add(definition);
			await db.SaveChangesAsync();

			LogDefinitionCreated(logger, definition.Id, definition.Title);
			return Results.Created($"/api/work-metrics/definitions/{definition.Id}", definition);
		});

		group.MapPut("/definitions/{id}", async (AppDbContext db, ILoggerFactory loggerFactory, int id, UpdateWorkMetricDefinitionDto dto) =>
		{
			var logger = loggerFactory.CreateLogger(nameof(WorkMetricEndpoints));

			var definition = await db.WorkMetricDefinitions.FindAsync(id);
			if (definition is null)
				return Results.NotFound();

			if (dto.Title is not null)
			{
				var title = dto.Title.Trim();
				if (title.Length == 0)
					return Results.BadRequest("title cannot be blank.");

				if (title != definition.Title && await db.WorkMetricDefinitions.AnyAsync(d => d.Title == title))
				{
					LogDefinitionRenameConflict(logger, id, title);
					return Results.Problem("A definition with that title already exists.", statusCode: 422);
				}

				// Renaming never rewrites existing entries — their Title is a snapshot.
				definition.Title = title;
			}
			if (dto.IsActive.HasValue)
				definition.IsActive = dto.IsActive.Value;
			if (dto.SortOrder.HasValue)
				definition.SortOrder = dto.SortOrder.Value;

			await db.SaveChangesAsync();

			LogDefinitionUpdated(logger, definition.Id);
			return Results.Ok(definition);
		});

		group.MapDelete("/definitions/{id}", async (AppDbContext db, ILoggerFactory loggerFactory, int id) =>
		{
			var logger = loggerFactory.CreateLogger(nameof(WorkMetricEndpoints));

			var definition = await db.WorkMetricDefinitions.FindAsync(id);
			if (definition is null)
				return Results.NotFound();

			// Entries survive as ad-hoc rows — the FK is ON DELETE SET NULL.
			db.WorkMetricDefinitions.Remove(definition);
			await db.SaveChangesAsync();

			LogDefinitionDeleted(logger, id);
			return Results.NoContent();
		});

		// ---- entries ----------------------------------------------------

		group.MapGet("/entries", async (AppDbContext db, IDateTimeProvider dateTime, string? weekOf) =>
		{
			if (string.IsNullOrWhiteSpace(weekOf))
				return Results.BadRequest("weekOf query parameter is required.");
			if (!WeekOfHelper.IsValid(weekOf))
				return Results.BadRequest("weekOf must be a Monday in yyyy-MM-dd format.");

			// Seeding is lazy, current-week-only, and idempotent: opening the
			// current week materialises a pending entry per active definition.
			if (weekOf == WeekOfHelper.FromDate(dateTime.UtcToday))
				await SeedCurrentWeekAsync(db, weekOf);

			var entries = await db.WorkMetricEntries
				.AsNoTracking()
				.Where(m => m.WeekOf == weekOf)
				.OrderBy(m => m.CreatedAt)
				.ThenBy(m => m.Id)
				.ToListAsync();

			return Results.Ok(entries);
		});

		// The external agent contract: idempotent upsert keyed on (WeekOf, Title).
		group.MapPut("/entries", async (AppDbContext db, ILoggerFactory loggerFactory, UpsertWorkMetricEntryDto dto) =>
		{
			var logger = loggerFactory.CreateLogger(nameof(WorkMetricEndpoints));

			if (string.IsNullOrWhiteSpace(dto.WeekOf) || !WeekOfHelper.IsValid(dto.WeekOf))
				return Results.BadRequest("weekOf must be a Monday in yyyy-MM-dd format.");

			var title = dto.Title?.Trim();
			if (string.IsNullOrEmpty(title))
				return Results.BadRequest("title is required.");

			var entry = await db.WorkMetricEntries
				.FirstOrDefaultAsync(m => m.WeekOf == dto.WeekOf && m.Title == title);

			if (entry is null)
			{
				var definition = await db.WorkMetricDefinitions
					.FirstOrDefaultAsync(d => d.Title == title);

				entry = new WorkMetricEntry
				{
					WeekOf = dto.WeekOf,
					Title = title,
					DefinitionId = definition?.Id,
				};
				db.WorkMetricEntries.Add(entry);
			}

			// Replace, never append — that is what makes agent re-runs idempotent.
			// Blank collapses to null so an agent reporting nothing reads as <pending>
			// rather than a filled-but-empty row. Content is stored verbatim: values
			// are multi-line, and trimming would eat intentional formatting.
			entry.Value = NormalizeValue(dto.Value);
			entry.Source = WorkMetricSource.Agent;
			entry.UpdatedAt = DateTime.UtcNow;
			await db.SaveChangesAsync();

			LogEntryUpserted(logger, entry.Id, entry.WeekOf, entry.Title);
			return Results.Ok(entry);
		});

		group.MapPost("/entries", async (AppDbContext db, ILoggerFactory loggerFactory, CreateWorkMetricEntryDto dto) =>
		{
			var logger = loggerFactory.CreateLogger(nameof(WorkMetricEndpoints));

			if (string.IsNullOrWhiteSpace(dto.WeekOf) || !WeekOfHelper.IsValid(dto.WeekOf))
				return Results.BadRequest("weekOf must be a Monday in yyyy-MM-dd format.");

			var title = dto.Title?.Trim();
			if (string.IsNullOrEmpty(title))
				return Results.BadRequest("title is required.");

			if (await db.WorkMetricEntries.AnyAsync(m => m.WeekOf == dto.WeekOf && m.Title == title))
			{
				LogDuplicateEntry(logger, title, dto.WeekOf);
				return Results.Problem("An entry with that title already exists for this week.", statusCode: 422);
			}

			var entry = new WorkMetricEntry
			{
				WeekOf = dto.WeekOf,
				Title = title,
				Value = NormalizeValue(dto.Value),
				Source = WorkMetricSource.App,
			};
			db.WorkMetricEntries.Add(entry);
			await db.SaveChangesAsync();

			LogEntryCreated(logger, entry.Id, entry.WeekOf);
			return Results.Created($"/api/work-metrics/entries/{entry.Id}", entry);
		});

		group.MapPut("/entries/{id}", async (AppDbContext db, ILoggerFactory loggerFactory, int id, UpdateWorkMetricEntryDto dto) =>
		{
			var logger = loggerFactory.CreateLogger(nameof(WorkMetricEndpoints));

			var entry = await db.WorkMetricEntries.FindAsync(id);
			if (entry is null)
				return Results.NotFound();

			if (dto.Title is not null)
			{
				var title = dto.Title.Trim();
				if (title.Length == 0)
					return Results.BadRequest("title cannot be blank.");

				if (title != entry.Title
					&& await db.WorkMetricEntries.AnyAsync(m => m.WeekOf == entry.WeekOf && m.Title == title))
				{
					LogEntryRenameConflict(logger, id, title);
					return Results.Problem("An entry with that title already exists for this week.", statusCode: 422);
				}

				entry.Title = title;
			}
			if (dto.Value is not null)
				entry.Value = NormalizeValue(dto.Value);

			// A hand edit takes ownership of the row back from the agent.
			entry.Source = WorkMetricSource.App;
			entry.UpdatedAt = DateTime.UtcNow;
			await db.SaveChangesAsync();

			LogEntryUpdated(logger, entry.Id);
			return Results.Ok(entry);
		});

		group.MapDelete("/entries/{id}", async (AppDbContext db, ILoggerFactory loggerFactory, int id) =>
		{
			var logger = loggerFactory.CreateLogger(nameof(WorkMetricEndpoints));

			var entry = await db.WorkMetricEntries.FindAsync(id);
			if (entry is null)
				return Results.NotFound();

			db.WorkMetricEntries.Remove(entry);
			await db.SaveChangesAsync();

			LogEntryDeleted(logger, id);
			return Results.NoContent();
		});

		// ---- historical listing -----------------------------------------

		group.MapGet("/weeks", async (AppDbContext db) =>
		{
			var weeks = await db.WorkMetricEntries
				.AsNoTracking()
				.GroupBy(m => m.WeekOf)
				.Select(g => new
				{
					weekOf = g.Key,
					entryCount = g.Count(),
					filledCount = g.Count(m => m.Value != null && m.Value != ""),
				})
				.OrderByDescending(w => w.weekOf)
				.ToListAsync();

			return Results.Ok(weeks);
		});

		return group;
	}

	// Null, empty, and whitespace-only all mean "nothing recorded" and must collapse to
	// null — the UI reads only null as <pending>, and GET /weeks counts only non-blank
	// values as filled. Every write path routes through here so the two agree.
	private static string? NormalizeValue(string? value)
	{
		return string.IsNullOrWhiteSpace(value) ? null : value;
	}

	private static async Task SeedCurrentWeekAsync(AppDbContext db, string weekOf)
	{
		var activeTitles = await db.WorkMetricDefinitions
			.Where(d => d.IsActive)
			.OrderBy(d => d.SortOrder)
			.ThenBy(d => d.CreatedAt)
			.Select(d => new { d.Id, d.Title })
			.ToListAsync();

		if (activeTitles.Count == 0)
			return;

		var existingTitles = await db.WorkMetricEntries
			.Where(m => m.WeekOf == weekOf)
			.Select(m => m.Title)
			.ToListAsync();

		var missing = activeTitles.Where(d => !existingTitles.Contains(d.Title)).ToList();
		if (missing.Count == 0)
			return;

		foreach (var definition in missing)
		{
			db.WorkMetricEntries.Add(new WorkMetricEntry
			{
				WeekOf = weekOf,
				Title = definition.Title,
				DefinitionId = definition.Id,
				Source = WorkMetricSource.App,
			});
		}

		await db.SaveChangesAsync();
	}
}
