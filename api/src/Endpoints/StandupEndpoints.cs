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
using Microsoft.SemanticKernel.Connectors.OpenAI;

namespace DailyWork.Api.Endpoints;

internal static partial class StandupEndpoints
{
	[LoggerMessage(Level = LogLevel.Warning, Message = "Ignoring unknown standup generation {GenerationId} on save for {Date}")]
	private static partial void LogUnknownGeneration(ILogger logger, int generationId, DateOnly date);

	private static readonly JsonSerializerOptions JsonOptions = new()
	{
		PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
		Converters = { new JsonStringEnumConverter() },
	};

	// The standup context is serialized without null members so a small model never sees a
	// literal "null" (e.g. an absent weeklyGoal or oneThing) that it would otherwise echo verbatim.
	private static readonly JsonSerializerOptions ContextJsonOptions = new()
	{
		PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
		Converters = { new JsonStringEnumConverter() },
		DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
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

		group.MapPost("/", async (AppDbContext db, IConfiguration config, ILoggerFactory loggerFactory, SaveUpdateCommDto dto) =>
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
				entry = type switch
				{
					CommType.WeeklyUpdate => new WeeklyUpdateComm { Date = date, Markdown = dto.Markdown },
					CommType.WeeklySummary => new WeeklySummaryComm { Date = date, Markdown = dto.Markdown },
					_ => new DailyStandupComm { Date = date, Markdown = dto.Markdown },
				};
				db.UpdateComms.Add(entry);
			}

			// Link the saved (edited) markdown to the draft it came from, so the pair can be exported
			if (dto.GenerationId is not null && IsFeedbackCaptureEnabled(config))
			{
				var generation = await db.StandupGenerations.FindAsync(dto.GenerationId.Value);
				if (generation is not null)
				{
					entry.GenerationId = generation.Id;
				}
				else
				{
					LogUnknownGeneration(loggerFactory.CreateLogger(nameof(StandupEndpoints)), dto.GenerationId.Value, date);
				}
			}

			await db.SaveChangesAsync();
			return Results.Ok(new { entry.Markdown, Date = entry.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) });
		});

		group.MapPost("/generate-weekly-summary", async (
			AppDbContext db,
			IChatCompletionService? chatService,
			string? weekOf) =>
		{
			if (chatService is null)
				return Results.Problem("Azure OpenAI is not configured.", statusCode: 503);

			if (weekOf is null)
				return Results.BadRequest("weekOf query parameter is required.");

			if (!DateOnly.TryParse(weekOf, CultureInfo.InvariantCulture, out var weekStart))
				return Results.BadRequest("weekOf must be a valid date (yyyy-MM-dd).");

			var weekEnd = weekStart.AddDays(4);

			var dailyComms = await db.UpdateComms
				.AsNoTracking()
				.Where(c => c.CommType == CommType.DailyStandup
					&& c.Date >= weekStart
					&& c.Date <= weekEnd)
				.OrderBy(c => c.Date)
				.Select(c => new { Date = c.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture), c.Markdown })
				.ToListAsync();

			var dailyCommsJson = JsonSerializer.Serialize(dailyComms, JsonOptions);

			var chatHistory = new ChatHistory();
			chatHistory.AddSystemMessage(WeeklySummaryPrompts.GetSystemPrompt());
			chatHistory.AddUserMessage(WeeklySummaryPrompts.BuildUserMessage(weekOf, dailyCommsJson));

			var response = await chatService.GetChatMessageContentAsync(chatHistory);
			var markdown = response.Content ?? string.Empty;

			var existing = await db.UpdateComms.FirstOrDefaultAsync(
				c => c.Date == weekStart && c.CommType == CommType.WeeklySummary);

			if (existing is not null)
			{
				existing.Markdown = markdown;
			}
			else
			{
				db.UpdateComms.Add(new WeeklySummaryComm { Date = weekStart, Markdown = markdown });
			}

			await db.SaveChangesAsync();

			return Results.Ok(new { markdown, weekOf });
		});

		group.MapPost("/generate", async (
			AppDbContext db,
			IDateTimeProvider dateTime,
			IChatCompletionService? chatService,
			IConfiguration config,
			ILoggerFactory loggerFactory,
			string? weekOf,
			string? commandType,
			DateOnly? today) =>
		{
			if (chatService is null)
				return Results.Problem("Azure OpenAI is not configured.", statusCode: 503);

			if (weekOf is null)
				return Results.BadRequest("weekOf query parameter is required.");

			var todayDate = today ?? dateTime.UtcToday;
			// Roll "yesterday" back over the weekend so Mon/Sat/Sun all point to Friday.
			var yesterdayDate = todayDate.DayOfWeek switch
			{
				DayOfWeek.Monday => todayDate.AddDays(-3),
				DayOfWeek.Sunday => todayDate.AddDays(-2),
				_ => todayDate.AddDays(-1),
			};

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

			var dayOfWeek = todayDate.DayOfWeek;
			var useWeeklyPrompt = string.Equals(commandType, "weekly", StringComparison.OrdinalIgnoreCase);
			// Monday daily standups keep the legacy raw-items message until the Monday prompt exists.
			var useLegacyWeeklyShape = useWeeklyPrompt || dayOfWeek == DayOfWeek.Monday;

			var systemPrompt = useWeeklyPrompt
				? StandupPrompts.GetSystemPrompt(DayOfWeek.Monday)
				: StandupPrompts.GetSystemPrompt(dayOfWeek);

			var todayStr = todayDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
			var yesterdayStr = yesterdayDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

			string userMessage;
			if (useLegacyWeeklyShape)
			{
				// Monday/weekly reflect back on the previous week, so include its items too
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
				var workItemsJson = JsonSerializer.Serialize(items, JsonOptions);
				userMessage = StandupPrompts.BuildWeeklyUserMessage(workItemsJson, todayStr, yesterdayStr);
			}
			else
			{
				var logger = loggerFactory.CreateLogger(nameof(StandupEndpoints));

				// Today's calendar forecast (persisted by the planning modal), trimmed to the
				// two fields the prompt uses
				var forecastJson = await db.WorkSessions
					.AsNoTracking()
					.Where(s => s.Date == todayDate)
					.Select(s => s.CalendarForecastJson)
					.FirstOrDefaultAsync();
				var forecast = StandupContextBuilder.TryParseForecast(forecastJson, logger);

				var context = StandupContextBuilder.Build(items, todayDate, yesterdayDate, forecast);
				var contextJson = JsonSerializer.Serialize(context, ContextJsonOptions);

				// Exclude the opener used in yesterday's saved standup so it never repeats back-to-back
				var previousMarkdown = await db.UpdateComms
					.AsNoTracking()
					.Where(c => c.CommType == CommType.DailyStandup && c.Date == yesterdayDate)
					.Select(c => c.Markdown)
					.FirstOrDefaultAsync();
				var opener = StandupPrompts.PickOpener(context.Yesterday.OneThing?.Status, previousMarkdown);

				// On Fridays, fetch consumed learning queue items for the week
				string? learningQueueJson = null;
				if (dayOfWeek == DayOfWeek.Friday)
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

				userMessage = StandupPrompts.BuildUserMessage(todayStr, yesterdayStr, contextJson, opener, context.WeeklyGoal, learningQueueJson);
			}

			var chatHistory = new ChatHistory();
			chatHistory.AddSystemMessage(systemPrompt);
			chatHistory.AddUserMessage(userMessage);

			var settings = new OpenAIPromptExecutionSettings { Temperature = 0.35 };
			var response = await chatService.GetChatMessageContentAsync(chatHistory, settings);
			var markdown = response.Content ?? string.Empty;

			int? generationId = null;
			if (IsFeedbackCaptureEnabled(config))
			{
				var promptVariant = useWeeklyPrompt ? "weekly" : dayOfWeek switch
				{
					DayOfWeek.Monday => "monday",
					DayOfWeek.Friday => "friday",
					_ => "midweek",
				};
				var generation = new StandupGeneration
				{
					Date = todayDate,
					CommType = ResolveCommType(commandType),
					PromptVariant = $"{promptVariant}-{StandupPrompts.PromptVersion}",
					SystemPrompt = systemPrompt,
					UserMessage = userMessage,
					GeneratedMarkdown = markdown,
				};
				db.StandupGenerations.Add(generation);
				await db.SaveChangesAsync();
				generationId = generation.Id;
			}

			return Results.Ok(new { markdown, generationId });
		});

		group.MapGet("/feedback-pairs", async (AppDbContext db, IConfiguration config, DateOnly? from, DateOnly? to) =>
		{
			if (!IsFeedbackCaptureEnabled(config))
				return Results.NotFound();

			if (from is null || to is null)
				return Results.BadRequest("from and to query parameters are required (yyyy-MM-dd).");

			var pairs = await db.UpdateComms
				.AsNoTracking()
				.Where(c => c.GenerationId != null && c.Date >= from && c.Date <= to)
				.Join(db.StandupGenerations, c => c.GenerationId, g => (int?)g.Id, (c, g) => new { Comm = c, Generation = g })
				.OrderBy(p => p.Comm.Date)
				.ThenBy(p => p.Comm.CommType)
				.Select(p => new
				{
					p.Comm.Date,
					p.Comm.CommType,
					p.Generation.PromptVariant,
					p.Generation.SystemPrompt,
					p.Generation.UserMessage,
					p.Generation.GeneratedMarkdown,
					SubmittedMarkdown = p.Comm.Markdown,
				})
				.ToListAsync();

			return Results.Ok(pairs);
		});

		return group;
	}

	private static bool IsFeedbackCaptureEnabled(IConfiguration config) =>
		config.GetValue<bool>("Features:StandupFeedbackCapture");

	private static CommType ResolveCommType(string? commandType)
	{
		if (string.Equals(commandType, "weekly", StringComparison.OrdinalIgnoreCase))
			return CommType.WeeklyUpdate;
		if (string.Equals(commandType, "weekly-summary", StringComparison.OrdinalIgnoreCase))
			return CommType.WeeklySummary;
		return CommType.DailyStandup;
	}
}
