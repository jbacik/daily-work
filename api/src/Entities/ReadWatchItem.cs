namespace DailyWork.Api.Entities;

internal class ReadWatchItem
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public required string Url { get; set; }
    public bool IsDone { get; set; }
    public DateOnly Date { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
