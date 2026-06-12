using DailyWork.Api.Data;
using DailyWork.Api.Dtos;
using DailyWork.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace DailyWork.Api.Endpoints;

internal static class WorkSessionEndpoints
{
	public static RouteGroupBuilder MapWorkSessionEndpoints(this WebApplication app)
	{
		var group = app.MapGroup("/api/work-sessions");

		group.MapGet("/", async (AppDbContext db, DateOnly date) =>
		{
			var session = await db.WorkSessions.AsNoTracking().SingleOrDefaultAsync(s => s.Date == date);
			return session is null ? Results.NoContent() : Results.Ok(session);
		});

		group.MapPost("/clock-in", async (AppDbContext db, IDateTimeProvider dateTime, DateOnly date) =>
		{
			var session = await db.WorkSessions.SingleOrDefaultAsync(s => s.Date == date);

			if (session is null)
			{
				session = new WorkSession
				{
					Date = date,
					ClockedInAt = dateTime.UtcNow,
					CreatedAt = dateTime.UtcNow,
				};
				db.WorkSessions.Add(session);
				await db.SaveChangesAsync();
				return Results.Ok(session);
			}

			if (session.ClockedInAt is null)
			{
				session.ClockedInAt = dateTime.UtcNow;
				await db.SaveChangesAsync();
			}

			return Results.Ok(session);
		});

		group.MapPost("/clock-out", async (AppDbContext db, IDateTimeProvider dateTime, DateOnly date) =>
		{
			var session = await db.WorkSessions.SingleOrDefaultAsync(s => s.Date == date);

			if (session is null)
			{
				session = new WorkSession
				{
					Date = date,
					ClockedOutAt = dateTime.UtcNow,
					CreatedAt = dateTime.UtcNow,
				};
				db.WorkSessions.Add(session);
				await db.SaveChangesAsync();
				return Results.Ok(session);
			}

			if (session.ClockedOutAt is null)
			{
				session.ClockedOutAt = dateTime.UtcNow;
				await db.SaveChangesAsync();
			}

			return Results.Ok(session);
		});

		group.MapPut("/", async (AppDbContext db, IDateTimeProvider dateTime, PunchWorkSessionDto dto, DateOnly date) =>
		{
			if (dto.ClockedOutAt.HasValue && !dto.ClockedInAt.HasValue)
				return Results.Problem("Cannot set clock-out without clock-in", statusCode: 422);

			if (dto.ClockedInAt.HasValue && dto.ClockedOutAt.HasValue && dto.ClockedOutAt.Value <= dto.ClockedInAt.Value)
				return Results.Problem("Clock-out must be after clock-in", statusCode: 422);

			var session = await db.WorkSessions.SingleOrDefaultAsync(s => s.Date == date);

			if (session is null)
			{
				session = new WorkSession
				{
					Date = date,
					ClockedInAt = dto.ClockedInAt,
					ClockedOutAt = dto.ClockedOutAt,
					CreatedAt = dateTime.UtcNow,
				};
				db.WorkSessions.Add(session);
			}
			else
			{
				session.ClockedInAt = dto.ClockedInAt;
				session.ClockedOutAt = dto.ClockedOutAt;
			}

			if (dto.Reflections is not null)
			{
				var wins = dto.Reflections.Wins?.Trim();
				var whines = dto.Reflections.Whines?.Trim();
				var valueAdds = dto.Reflections.ValueAdds?.Trim();
				session.Reflections =
					string.IsNullOrWhiteSpace(wins) &&
					string.IsNullOrWhiteSpace(whines) &&
					string.IsNullOrWhiteSpace(valueAdds)
						? null
						: new WorkSessionReflections { Wins = wins, Whines = whines, ValueAdds = valueAdds };
			}

			await db.SaveChangesAsync();
			return Results.Ok(session);
		});

		return group;
	}
}
