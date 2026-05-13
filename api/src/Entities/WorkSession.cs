namespace DailyWork.Api.Entities;

internal class WorkSession
{
	public int Id { get; set; }
	public DateOnly Date { get; set; }
	public DateTime? ClockedInAt { get; set; }
	public DateTime? ClockedOutAt { get; set; }
	public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
