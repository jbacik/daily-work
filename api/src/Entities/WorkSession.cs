namespace DailyWork.Api.Entities;

internal class WorkSession
{
	public int Id { get; set; }
	public DateOnly Date { get; set; }
	public DateTime? ClockedInAt { get; set; }
	public DateTime? ClockedOutAt { get; set; }
	public DateTime CreatedAt { get; set; }
	public WorkSessionReflections? Reflections { get; set; }
	public string? CalendarForecastJson { get; set; }
}

internal record WorkSessionReflections
{
	public string? Wins { get; init; }
	public string? Whines { get; init; }
	public string? ValueAdds { get; init; }
}
