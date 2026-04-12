using System.Text.RegularExpressions;
using DailyWork.Api.Data;
using DailyWork.Api.Dtos;
using DailyWork.Api.Entities;
using DailyWork.Api.Enums;
using Microsoft.EntityFrameworkCore;

namespace DailyWork.Api.Endpoints;

internal static partial class ReadWatchEndpoints
{
	[GeneratedRegex(@"(https?://\S+)", RegexOptions.Compiled)]
	private static partial Regex UrlRegex();

	public static RouteGroupBuilder MapReadWatchEndpoints(this WebApplication app)
	{
		var group = app.MapGroup("/api/read-watch");

		group.MapGet("/", async (AppDbContext db, DateOnly? weekOf) =>
		{
			if (weekOf is not null)
			{
				// Weekly view: all not-done items + consumed items from this week
				return await db.ReadWatchItems
					.AsNoTracking()
					.Where(r => !r.IsDone || r.WeekConsumed == weekOf)
					.OrderBy(r => r.CreatedAt)
					.ToListAsync();
			}

			// Daily view: all active, not-done items regardless of date
			return await db.ReadWatchItems
				.AsNoTracking()
				.Where(r => r.IsActive && !r.IsDone)
				.OrderBy(r => r.CreatedAt)
				.ToListAsync();
		});

		group.MapPost("/", async (AppDbContext db, IDateTimeProvider dateTime, CreateReadWatchItemDto dto) =>
		{
			var d = dto.Date ?? dateTime.UtcToday;
			if (dto.IsActive != false)
			{
				var count = await db.ReadWatchItems.CountAsync(r => r.IsActive && !r.IsDone);
				if (count >= 5)
					return Results.Problem("Maximum of 5 active read/watch items.", statusCode: 400);
			}

			var (title, url) = ParseTextForUrl(dto.Text);
			var type = Enum.TryParse<ReadWatchType>(dto.Type, ignoreCase: true, out var parsed) ? parsed : ReadWatchType.Read;

			var item = new ReadWatchItem
			{
				Title = title,
				Url = url,
				Type = type,
				Date = d,
				IsActive = dto.IsActive ?? true,
			};
			db.ReadWatchItems.Add(item);
			await db.SaveChangesAsync();
			return Results.Created($"/api/read-watch/{item.Id}", item);
		});

		group.MapPut("/{id}", async (AppDbContext db, int id, UpdateReadWatchItemDto dto) =>
		{
			var item = await db.ReadWatchItems.FindAsync(id);
			if (item is null)
				return Results.NotFound();

			if (dto.Title is not null)
				item.Title = dto.Title;
			if (dto.Url is not null)
				item.Url = dto.Url;
			if (dto.IsActive.HasValue)
				item.IsActive = dto.IsActive.Value;

			await db.SaveChangesAsync();
			return Results.Ok(item);
		});

		group.MapPut("/{id}/consume", async (AppDbContext db, int id, ConsumeReadWatchItemDto dto) =>
		{
			var item = await db.ReadWatchItems.FindAsync(id);
			if (item is null)
				return Results.NotFound();

			item.IsDone = true;
			item.IsActive = false;
			item.WorthSharing = dto.WorthSharing;
			item.Notes = dto.Notes;
			if (item.WeekConsumed is null)
				item.WeekConsumed = dto.WeekOf;

			await db.SaveChangesAsync();
			return Results.Ok(item);
		});

		group.MapDelete("/{id}", async (AppDbContext db, int id) =>
		{
			var item = await db.ReadWatchItems.FindAsync(id);
			if (item is null)
				return Results.NotFound();

			db.ReadWatchItems.Remove(item);
			await db.SaveChangesAsync();
			return Results.NoContent();
		});

		return group;
	}

	internal static (string Title, string Url) ParseTextForUrl(string text)
	{
		var match = UrlRegex().Match(text);
		if (!match.Success)
			return (text.Trim(), string.Empty);

		var url = match.Value;
		var title = text.Replace(url, "").Trim();

		// If the text was only a URL, use the URL as the title
		if (string.IsNullOrWhiteSpace(title))
			return (url, url);

		return (title, url);
	}
}
