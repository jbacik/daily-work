using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using DailyWork.Api.Data;
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

        group.MapPost("/generate", async (
            AppDbContext db,
            IDateTimeProvider dateTime,
            IChatCompletionService chatService,
            string? weekOf,
            string? commandType) =>
        {
            if (weekOf is null)
                return Results.BadRequest("weekOf query parameter is required.");

            var today = dateTime.UtcToday;

            var items = await db.WorkItems
                .AsNoTracking()
                .Where(w => w.WeekOf == weekOf)
                .OrderBy(w => w.Date)
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

            var chatHistory = new ChatHistory();
            chatHistory.AddSystemMessage(systemPrompt);
            chatHistory.AddUserMessage(StandupPrompts.BuildUserMessage(workItemsJson, today.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)));

            var response = await chatService.GetChatMessageContentAsync(chatHistory);

            return Results.Ok(new { markdown = response.Content });
        });

        return group;
    }
}
