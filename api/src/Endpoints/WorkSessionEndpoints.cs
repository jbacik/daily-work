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

		group.MapGet("/week", async (AppDbContext db, DateOnly weekOf) =>
		{
			var end = weekOf.AddDays(4);
			var sessions = await db.WorkSessions
				.AsNoTracking()
				.Where(s => s.Date >= weekOf && s.Date <= end)
				.OrderBy(s => s.Date)
				.ToListAsync();
			return Results.Ok(sessions);
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
			var session = await db.WorkSessions.SingleOrDefaultAsync(s => s.Date == date);

			// Validate the punch pair only when it actually changes. The reflection-save
			// flows re-send the session's existing timestamps unchanged, and a stored
			// clock-out-without-clock-in (which the clock-out endpoint legitimately
			// creates) must not be rejected just because a reflection is being edited.
			var timesUnchanged = session is not null
				&& session.ClockedInAt == dto.ClockedInAt
				&& session.ClockedOutAt == dto.ClockedOutAt;

			if (!timesUnchanged)
			{
				if (dto.ClockedOutAt.HasValue && !dto.ClockedInAt.HasValue)
					return Results.Problem("Cannot set clock-out without clock-in", statusCode: 422);

				if (dto.ClockedInAt.HasValue && dto.ClockedOutAt.HasValue && dto.ClockedOutAt.Value <= dto.ClockedInAt.Value)
					return Results.Problem("Clock-out must be after clock-in", statusCode: 422);
			}

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
				// Null each blank field individually (the web client sends "" for untouched
				// textareas) so we never persist empty strings; null the whole object when all blank.
				var wins = string.IsNullOrWhiteSpace(dto.Reflections.Wins) ? null : dto.Reflections.Wins.Trim();
				var whines = string.IsNullOrWhiteSpace(dto.Reflections.Whines) ? null : dto.Reflections.Whines.Trim();
				var valueAdds = string.IsNullOrWhiteSpace(dto.Reflections.ValueAdds) ? null : dto.Reflections.ValueAdds.Trim();
				session.Reflections = wins is null && whines is null && valueAdds is null
					? null
					: new WorkSessionReflections { Wins = wins, Whines = whines, ValueAdds = valueAdds };
			}

			await db.SaveChangesAsync();
			return Results.Ok(session);
		});

		return group;
	}
}
