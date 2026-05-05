using DailyWork.Api.Data;
using DailyWork.Api.Dtos;
using DailyWork.Api.Entities;
using DailyWork.Api.Enums;
using Microsoft.EntityFrameworkCore;

namespace DailyWork.Api.Endpoints;

internal static class WorkItemEndpoints
{
	public static RouteGroupBuilder MapWorkItemEndpoints(this WebApplication app)
	{
		var group = app.MapGroup("/api/work-items");

		group.MapGet("/", async (AppDbContext db, string? weekOf) =>
		{
			if (weekOf is null)
				return Results.BadRequest("weekOf query parameter is required.");

			var items = await db.WorkItems
				.AsNoTracking()
				.Where(w => w.WeekOf == weekOf)
				.OrderBy(w => w.Date)
				.ThenBy(w => w.SortOrder)
				.ThenBy(w => w.CreatedAt)
				.ToListAsync();

			return Results.Ok(items);
		});

		group.MapPost("/", async (AppDbContext db, IDateTimeProvider dateTime, CreateWorkItemDto dto) =>
		{
			var category = Enum.TryParse<WorkItemCategory>(dto.Category, out var parsedCat)
				? parsedCat
				: WorkItemCategory.SmallThing;

			var date = dto.Date ?? dateTime.UtcToday;
			var weekOf = ComputeWeekOf(date);

			var sortOrder = 0;
			if (category == WorkItemCategory.SmallThing)
			{
				var existing = await db.WorkItems
					.Where(w => w.Date == date && w.Category == WorkItemCategory.SmallThing)
					.ToListAsync();
				if (existing.Count >= 5)
					return Results.Problem("Maximum 5 tasks per day.", statusCode: 422);
				sortOrder = existing.Count == 0 ? 1 : existing.Max(w => w.SortOrder) + 1;
			}

			var item = new WorkItem
			{
				Title = dto.Title,
				Category = category,
				Date = date,
				WeekOf = weekOf,
				SortOrder = sortOrder,
			};
			db.WorkItems.Add(item);
			await db.SaveChangesAsync();
			return Results.Created($"/api/work-items/{item.Id}", item);
		});

		group.MapPut("/{id}", async (AppDbContext db, int id, UpdateWorkItemDto dto) =>
		{
			var item = await db.WorkItems.FindAsync(id);
			if (item is null)
			{
				return Results.NotFound();
			}

			if (dto.Title is not null)
			{
				item.Title = dto.Title;
			}
			if (dto.IsDone.HasValue)
			{
				item.IsDone = dto.IsDone.Value;
			}

			await db.SaveChangesAsync();
			return Results.Ok(item);
		});

		group.MapPut("/{id}/move-up", async (AppDbContext db, int id) =>
		{
			var item = await db.WorkItems.FindAsync(id);
			if (item is null)
				return Results.NotFound();

			if (item.Category == WorkItemCategory.BigThing)
				return Results.Problem("Cannot reorder a BigThing item.", statusCode: 422);

			var previous = await db.WorkItems
				.Where(w => w.Date == item.Date
					&& w.Category == item.Category
					&& w.SortOrder < item.SortOrder)
				.OrderByDescending(w => w.SortOrder)
				.FirstOrDefaultAsync();

			if (previous is null)
				return Results.Ok(item);

			(item.SortOrder, previous.SortOrder) = (previous.SortOrder, item.SortOrder);
			await db.SaveChangesAsync();
			return Results.Ok(item);
		});

		group.MapPut("/{id}/move-down", async (AppDbContext db, int id) =>
		{
			var item = await db.WorkItems.FindAsync(id);
			if (item is null)
				return Results.NotFound();

			if (item.Category == WorkItemCategory.BigThing)
				return Results.Problem("Cannot reorder a BigThing item.", statusCode: 422);

			var next = await db.WorkItems
				.Where(w => w.Date == item.Date
					&& w.Category == item.Category
					&& w.SortOrder > item.SortOrder)
				.OrderBy(w => w.SortOrder)
				.FirstOrDefaultAsync();

			if (next is null)
				return Results.Ok(item);

			(item.SortOrder, next.SortOrder) = (next.SortOrder, item.SortOrder);
			await db.SaveChangesAsync();
			return Results.Ok(item);
		});

		group.MapDelete("/{id}", async (AppDbContext db, int id) =>
		{
			var item = await db.WorkItems.FindAsync(id);
			if (item is null)
			{
				return Results.NotFound();
			}

			db.WorkItems.Remove(item);
			await db.SaveChangesAsync();
			return Results.NoContent();
		});

		return group;
	}

	private static string ComputeWeekOf(DateOnly date)
	{
		int daysToMonday = ((int)date.DayOfWeek - 1 + 7) % 7;
		return date.AddDays(-daysToMonday).ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
	}
}
