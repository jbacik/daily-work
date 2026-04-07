namespace DailyWork.Api.Entities;

internal class StandupEntry
{
    public int Id { get; set; }
    public DateOnly Date { get; set; }
    public required string Markdown { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
