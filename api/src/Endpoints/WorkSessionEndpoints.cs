using DailyWork.Api.Data;
using DailyWork.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace DailyWork.Api.Endpoints;

internal static class WorkSessionEndpoints
{
	public static RouteGroupBuilder MapWorkSessionEndpoints(this WebApplication app)
	{
		var group = app.MapGroup("/api/work-sessions");

		group.MapGet("/today", async (AppDbContext db, DateOnly date) =>
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

		return group;
	}
}
