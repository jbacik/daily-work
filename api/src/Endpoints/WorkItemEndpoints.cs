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

		group.MapGet("/", async (AppDbContext db, IDateTimeProvider dateTime, DateOnly? date) =>
		{
			var d = date ?? dateTime.UtcToday;
			return await db.WorkItems
				.Where(w => w.Date == d)
				.OrderBy(w => w.CreatedAt)
				.ToListAsync();
		});

		group.MapPost("/", async (AppDbContext db, IDateTimeProvider dateTime, CreateWorkItemDto dto) =>
		{
			var item = new WorkItem
			{
				Title = dto.Title,
				Category = Enum.TryParse<WorkItemCategory>(dto.Category, out var cat)
					? cat
					: WorkItemCategory.SmallThing,
				Date = dto.Date ?? dateTime.UtcToday
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

		group.MapPut("/{id}/promote", async (AppDbContext db, int id) =>
		{
			var item = await db.WorkItems.FindAsync(id);
			if (item is null)
			{
				return Results.NotFound();
			}

			// Demote any existing BigThing for the same date
			var existing = await db.WorkItems
				.Where(w => w.Date == item.Date && w.Category == WorkItemCategory.BigThing && w.Id != id)
				.ToListAsync();

			foreach (var e in existing)
			{
				e.Category = WorkItemCategory.SmallThing;
			}

			item.Category = WorkItemCategory.BigThing;
			await db.SaveChangesAsync();
			return Results.Ok(item);
		});

		group.MapPut("/{id}/demote", async (AppDbContext db, int id) =>
		{
			var item = await db.WorkItems.FindAsync(id);
			if (item is null)
			{
				return Results.NotFound();
			}

			item.Category = WorkItemCategory.SmallThing;
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
}
