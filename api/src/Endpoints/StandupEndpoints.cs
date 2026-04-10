using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using DailyWork.Api.Data;
using DailyWork.Api.Dtos;
using DailyWork.Api.Entities;
using DailyWork.Api.Enums;
using DailyWork.Api.Prompts;
using Microsoft.EntityFrameworkCore;
using Microsoft.SemanticKernel.ChatCompletion;

namespace DailyWork.Api.Endpoints;

internal static class StandupEndpoints
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        Converters = { new JsonStringEnumConverter() },
    };

    public static RouteGroupBuilder MapStandupEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/standup");

        group.MapGet("/", async (AppDbContext db, string? date, string? commandType) =>
        {
            if (date is null)
                return Results.BadRequest("date query parameter is required.");

            var parsedDate = DateOnly.Parse(date, CultureInfo.InvariantCulture);
            var type = ResolveCommType(commandType);
            var entry = await db.UpdateComms
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Date == parsedDate && c.CommType == type);

            if (entry is null)
                return Results.NotFound();

            return Results.Ok(new { entry.Markdown, Date = entry.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) });
        });

        group.MapPost("/", async (AppDbContext db, SaveUpdateCommDto dto) =>
        {
            var date = DateOnly.Parse(dto.Date, CultureInfo.InvariantCulture);
            var type = ResolveCommType(dto.CommandType);
            var entry = await db.UpdateComms.FirstOrDefaultAsync(c => c.Date == date && c.CommType == type);

            if (entry is not null)
            {
                entry.Markdown = dto.Markdown;
            }
            else
            {
                entry = type == CommType.WeeklyUpdate
                    ? new WeeklyUpdateComm { Date = date, Markdown = dto.Markdown }
                    : new DailyStandupComm { Date = date, Markdown = dto.Markdown };
                db.UpdateComms.Add(entry);
            }

            await db.SaveChangesAsync();
            return Results.Ok(new { entry.Markdown, Date = entry.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) });
        });

        group.MapPost("/generate", async (
            AppDbContext db,
            IDateTimeProvider dateTime,
            IChatCompletionService? chatService,
            string? weekOf,
            string? commandType) =>
        {
            if (chatService is null)
                return Results.Problem("Azure OpenAI is not configured.", statusCode: 503);

            if (weekOf is null)
                return Results.BadRequest("weekOf query parameter is required.");

            var today = dateTime.UtcToday;

            var items = await db.WorkItems
                .AsNoTracking()
                .Where(w => w.WeekOf == weekOf)
                .OrderBy(w => w.Date)
                .ThenBy(w => w.Category)
                .ThenBy(w => w.SortOrder)
                .ThenBy(w => w.CreatedAt)
                .ToListAsync();

            if (items.Count == 0)
                return Results.BadRequest("No work items found for the specified week.");

            // For Monday prompts or weekly command, also fetch previous week's items
            var dayOfWeek = today.DayOfWeek;
            var useWeeklyPrompt = string.Equals(commandType, "weekly", StringComparison.OrdinalIgnoreCase);

            if (dayOfWeek == DayOfWeek.Monday || useWeeklyPrompt)
            {
                var prevWeek = DateOnly.Parse(weekOf, CultureInfo.InvariantCulture)
                    .AddDays(-7)
                    .ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

                var prevItems = await db.WorkItems
                    .AsNoTracking()
                    .Where(w => w.WeekOf == prevWeek)
                    .OrderBy(w => w.Date)
                    .ThenBy(w => w.CreatedAt)
                    .ToListAsync();

                items = [.. prevItems, .. items];
            }

            var workItemsJson = JsonSerializer.Serialize(items, JsonOptions);
            var systemPrompt = useWeeklyPrompt
                ? StandupPrompts.GetSystemPrompt(DayOfWeek.Monday)
                : StandupPrompts.GetSystemPrompt(dayOfWeek);

            // On Fridays, fetch consumed learning queue items for the week
            string? learningQueueJson = null;
            if (dayOfWeek == DayOfWeek.Friday && !useWeeklyPrompt)
            {
                var weekStart = DateOnly.Parse(weekOf, CultureInfo.InvariantCulture);
                var consumedItems = await db.ReadWatchItems
                    .AsNoTracking()
                    .Where(r => r.IsDone && r.WeekConsumed == weekStart
                        && (r.Type == Enums.ReadWatchType.Experiment || r.WorthSharing == true))
                    .OrderByDescending(r => r.Type == Enums.ReadWatchType.Experiment)
                    .ThenByDescending(r => r.WorthSharing)
                    .ToListAsync();

                if (consumedItems.Count > 0)
                    learningQueueJson = JsonSerializer.Serialize(consumedItems, JsonOptions);
            }

            var chatHistory = new ChatHistory();
            chatHistory.AddSystemMessage(systemPrompt);
            chatHistory.AddUserMessage(StandupPrompts.BuildUserMessage(workItemsJson, today.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture), learningQueueJson));

            var response = await chatService.GetChatMessageContentAsync(chatHistory);

            return Results.Ok(new { markdown = response.Content });
        });

        return group;
    }

    private static CommType ResolveCommType(string? commandType) =>
        string.Equals(commandType, "weekly", StringComparison.OrdinalIgnoreCase)
            ? CommType.WeeklyUpdate
            : CommType.DailyStandup;
}
