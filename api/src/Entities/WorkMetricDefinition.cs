namespace DailyWork.Api.Entities;

internal class WorkMetricDefinition
{
	public int Id { get; set; }
	public required string Title { get; set; }
	public bool IsActive { get; set; } = true;
	public int SortOrder { get; set; }
	public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
