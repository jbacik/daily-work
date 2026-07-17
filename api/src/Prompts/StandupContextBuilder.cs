using System.Text.Json;
using DailyWork.Api.Dtos;
using DailyWork.Api.Entities;
using DailyWork.Api.Enums;

namespace DailyWork.Api.Prompts;

internal static partial class StandupContextBuilder
{
	[LoggerMessage(Level = LogLevel.Warning, Message = "Failed to parse calendar forecast JSON for standup; omitting forecast")]
	private static partial void LogForecastParseFailure(ILogger logger, Exception exception);

	private static readonly JsonSerializerOptions ForecastJsonOptions = new()
	{
		PropertyNameCaseInsensitive = true,
	};

	internal static StandupContext Build(
		IReadOnlyList<WorkItem> items,
		DateOnly today,
		DateOnly yesterday,
		StandupForecast? forecast)
	{
		var smallThings = items
			.Where(w => w.Category == WorkItemCategory.SmallThing)
			.OrderBy(w => w.SortOrder)
			.ThenBy(w => w.CreatedAt)
			.ToList();

		var weeklyGoal = items
			.Where(w => w.Category == WorkItemCategory.BigThing)
			.OrderBy(w => w.SortOrder)
			.ThenBy(w => w.CreatedAt)
			.Select(w => w.Title)
			.FirstOrDefault();

		var yesterdayItems = smallThings.Where(w => w.Date == yesterday).ToList();
		// Items that sat on (or before) yesterday but were moved forward — their Date no
		// longer matches, so they'd otherwise vanish from the standup entirely.
		var carriedAway = smallThings
			.Where(w => w.TimesMoved > 0 && w.OriginalDate <= yesterday && w.Date > yesterday)
			.ToList();

		var oneThingSource = yesterdayItems.FirstOrDefault();
		var yesterdayOneThing = oneThingSource is not null
			? new StandupItem(oneThingSource.Title, StatusOf(oneThingSource))
			: null;
		if (oneThingSource is null)
		{
			oneThingSource = carriedAway.FirstOrDefault();
			if (oneThingSource is not null)
				yesterdayOneThing = new StandupItem(oneThingSource.Title, "carried");
		}

		var yesterdayOthers = yesterdayItems
			.Where(w => w != oneThingSource)
			.Select(w => new StandupItem(w.Title, StatusOf(w)))
			.Concat(carriedAway
				.Where(w => w != oneThingSource)
				.Select(w => new StandupItem(w.Title, "carried")))
			.ToList();

		var todayItems = smallThings.Where(w => w.Date == today && !w.IsSkipped).ToList();
		var todayOneThing = todayItems.Count > 0
			? new StandupItem(todayItems[0].Title, StatusOf(todayItems[0]))
			: null;
		var alsoOnDeck = todayItems.Skip(1).Select(w => w.Title).ToList();

		return new StandupContext(
			weeklyGoal,
			new StandupYesterday(yesterdayOneThing, yesterdayOthers),
			new StandupToday(todayOneThing, alsoOnDeck),
			forecast?.SyncMeetings ?? [],
			forecast?.UpcomingPto ?? []);
	}

	internal static StandupForecast? TryParseForecast(string? json, ILogger logger)
	{
		if (string.IsNullOrWhiteSpace(json))
			return null;

		try
		{
			return JsonSerializer.Deserialize<StandupForecast>(json, ForecastJsonOptions);
		}
		catch (JsonException ex)
		{
			LogForecastParseFailure(logger, ex);
			return null;
		}
	}

	private static string StatusOf(WorkItem item) => item switch
	{
		{ IsDone: true } => "done",
		{ IsSkipped: true } => "skipped",
		_ => "notDone",
	};
}
