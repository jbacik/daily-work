using DailyWork.Api.Enums;

namespace DailyWork.Api.Entities;

internal class WorkMetricEntry
{
	public int Id { get; set; }
	public required string WeekOf { get; set; }
	public required string Title { get; set; }
	public string? Value { get; set; }
	public int? DefinitionId { get; set; }
	public WorkMetricSource Source { get; set; } = WorkMetricSource.App;
	public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
	public DateTime? UpdatedAt { get; set; }
}
