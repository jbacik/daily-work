using DailyWork.Api.Data;
using DailyWork.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace DailyWork.Api.Endpoints;

internal static class WorkSessionEndpoints
{
	public static RouteGroupBuilder MapWorkSessionEndpoints(this WebApplication app)
	{
		var group = app.MapGroup("/api/work-sessions");

		group.MapGet("/today", async (AppDbContext db, IDateTimeProvider dateTime) =>
		{
			var today = dateTime.UtcToday;
			var session = await db.WorkSessions.SingleOrDefaultAsync(s => s.Date == today);
			return session is null ? Results.NoContent() : Results.Ok(session);
		});

		group.MapPost("/clock-in", async (AppDbContext db, IDateTimeProvider dateTime) =>
		{
			var today = dateTime.UtcToday;
			var session = await db.WorkSessions.SingleOrDefaultAsync(s => s.Date == today);

			if (session is null)
			{
				session = new WorkSession
				{
					Date = today,
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

		group.MapPost("/clock-out", async (AppDbContext db, IDateTimeProvider dateTime) =>
		{
			var today = dateTime.UtcToday;
			var session = await db.WorkSessions.SingleOrDefaultAsync(s => s.Date == today);

			if (session is null)
			{
				session = new WorkSession
				{
					Date = today,
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
