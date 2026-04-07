using DailyWork.Api.Data;
using DailyWork.Api.Dtos;
using DailyWork.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace DailyWork.Api.Endpoints;

internal static class ScratchPadEndpoints
{
    public static RouteGroupBuilder MapScratchPadEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/scratchpad");

        group.MapGet("/", async (AppDbContext db) =>
        {
            var entry = await db.ScratchPads.FirstOrDefaultAsync(s => s.IsActive);
            if (entry is null)
                return Results.Ok(new { content = (string?)null, isActive = true });

            return Results.Ok(entry);
        });

        group.MapPut("/", async (AppDbContext db, UpsertScratchPadDto dto) =>
        {
            var entry = await db.ScratchPads.FirstOrDefaultAsync(s => s.IsActive);

            if (entry is not null)
            {
                entry.Content = dto.Content;
                entry.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                entry = new ScratchPad { Content = dto.Content };
                db.ScratchPads.Add(entry);
            }

            await db.SaveChangesAsync();
            return Results.Ok(entry);
        });

        group.MapPost("/clean", async (AppDbContext db) =>
        {
            var entry = await db.ScratchPads.FirstOrDefaultAsync(s => s.IsActive);
            if (entry is null)
                return Results.NoContent();

            entry.IsActive = false;
            entry.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        return group;
    }
}
