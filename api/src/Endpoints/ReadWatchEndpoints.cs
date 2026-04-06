using DailyWork.Api.Data;
using DailyWork.Api.Dtos;
using DailyWork.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace DailyWork.Api.Endpoints;

internal static class ReadWatchEndpoints
{
	public static RouteGroupBuilder MapReadWatchEndpoints(this WebApplication app)
	{
		var group = app.MapGroup("/api/read-watch");

		group.MapGet("/", async (AppDbContext db, IDateTimeProvider dateTime, DateOnly? date) =>
		{
			var d = date ?? dateTime.UtcToday;
			return await db.ReadWatchItems
				.Where(r => r.Date == d)
				.OrderBy(r => r.CreatedAt)
				.ToListAsync();
		});

		group.MapPost("/", async (AppDbContext db, IDateTimeProvider dateTime, CreateReadWatchItemDto dto) =>
		{
			var d = dto.Date ?? dateTime.UtcToday;
			var count = await db.ReadWatchItems.CountAsync(r => r.Date == d);
			if (count >= 5)
			{
				return Results.Problem("Maximum of 5 read/watch items per day.", statusCode: 400);
			}

			var item = new ReadWatchItem
			{
				Title = dto.Title,
				Url = dto.Url,
				Date = d
			};
			db.ReadWatchItems.Add(item);
			await db.SaveChangesAsync();
			return Results.Created($"/api/read-watch/{item.Id}", item);
		});

		group.MapPut("/{id}", async (AppDbContext db, int id, UpdateReadWatchItemDto dto) =>
		{
			var item = await db.ReadWatchItems.FindAsync(id);
			if (item is null)
			{
				return Results.NotFound();
			}

			if (dto.Title is not null)
			{
				item.Title = dto.Title;
			}
			if (dto.Url is not null)
			{
				item.Url = dto.Url;
			}
			if (dto.IsDone.HasValue)
			{
				item.IsDone = dto.IsDone.Value;
			}

			await db.SaveChangesAsync();
			return Results.Ok(item);
		});

		group.MapDelete("/{id}", async (AppDbContext db, int id) =>
		{
			var item = await db.ReadWatchItems.FindAsync(id);
			if (item is null)
			{
				return Results.NotFound();
			}

			db.ReadWatchItems.Remove(item);
			await db.SaveChangesAsync();
			return Results.NoContent();
		});

		return group;
	}
}
