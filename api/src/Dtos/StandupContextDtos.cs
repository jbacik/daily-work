using System.Text.Json.Serialization;

namespace DailyWork.Api.Dtos;

internal record StandupItem(string Title, string Status);

internal record StandupYesterday(StandupItem? OneThing, List<StandupItem> Others);

internal record StandupToday(StandupItem? OneThing, List<string> AlsoOnDeck);

internal record StandupPto(string Title, string? Start, string? End);

internal record StandupContext(
	string? WeeklyGoal,
	StandupYesterday Yesterday,
	StandupToday Today,
	List<string> SyncMeetings,
	[property: JsonPropertyName("upcomingPTO")] List<StandupPto> UpcomingPto);

// Tolerant parse target for WorkSession.CalendarForecastJson — only the two fields
// the standup prompt uses; unknown forecast fields are ignored, missing keys stay null.
internal record StandupForecast(List<string>? SyncMeetings, List<StandupPto>? UpcomingPto);
