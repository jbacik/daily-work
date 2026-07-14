using System.Text.Json;
using DailyWork.Api.Data;
using DailyWork.Api.Dtos;
using DailyWork.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace DailyWork.Api.Endpoints;

internal static class ForecastEndpoints
{
	public static RouteGroupBuilder MapForecastEndpoints(this WebApplication app)
	{
		var group = app.MapGroup("/api/forecast");

		group.MapGet("/", async (AppDbContext db, IDateTimeProvider dateTime, IConfiguration config, IWebHostEnvironment env, DateOnly date) =>
		{
			var fileName = ForecastFileName(date);
			var session = await db.WorkSessions.SingleOrDefaultAsync(s => s.Date == date);

			if (session?.CalendarForecastJson is not null)
				return Results.Ok(new { json = session.CalendarForecastJson, fileName, source = "database" });

			var filePath = Path.Combine(ResolveForecastDirectory(config, env), fileName);
			if (!File.Exists(filePath))
				return Results.NotFound();

			var text = await File.ReadAllTextAsync(filePath);
			if (!IsValidJson(text))
				return Results.Problem($"Forecast file '{fileName}' contains invalid JSON.", statusCode: 422);

			if (session is null)
			{
				session = new WorkSession { Date = date, CreatedAt = dateTime.UtcNow };
				db.WorkSessions.Add(session);
			}
			session.CalendarForecastJson = text;
			await db.SaveChangesAsync();

			return Results.Ok(new { json = text, fileName, source = "file" });
		});

		group.MapPost("/", async (AppDbContext db, IDateTimeProvider dateTime, UploadForecastDto dto, DateOnly date) =>
		{
			if (string.IsNullOrWhiteSpace(dto.Json) || !IsValidJson(dto.Json))
				return Results.Problem("Invalid JSON", statusCode: 422);

			var session = await db.WorkSessions.SingleOrDefaultAsync(s => s.Date == date);
			if (session is null)
			{
				session = new WorkSession { Date = date, CreatedAt = dateTime.UtcNow };
				db.WorkSessions.Add(session);
			}
			session.CalendarForecastJson = dto.Json;
			await db.SaveChangesAsync();

			return Results.Ok(new { json = dto.Json, fileName = ForecastFileName(date), source = "upload" });
		});

		group.MapDelete("/", async (AppDbContext db, DateOnly date) =>
		{
			var session = await db.WorkSessions.SingleOrDefaultAsync(s => s.Date == date);
			if (session is not null)
			{
				session.CalendarForecastJson = null;
				await db.SaveChangesAsync();
			}

			return Results.NoContent();
		});

		return group;
	}

	private static string ForecastFileName(DateOnly date) =>
		$"daily-forecast-{date:yyyy-MM-dd}.json";

	private static string ResolveForecastDirectory(IConfiguration config, IWebHostEnvironment env)
	{
		var dir = config["CalendarForecasts:Directory"] ?? "../../resources/calendar-forecasts";
		return Path.GetFullPath(dir, env.ContentRootPath);
	}

	private static bool IsValidJson(string text)
	{
		try
		{
			using var _ = JsonDocument.Parse(text);
			return true;
		}
		catch (JsonException)
		{
			return false;
		}
	}
}
