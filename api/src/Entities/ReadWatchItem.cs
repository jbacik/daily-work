using DailyWork.Api.Enums;

namespace DailyWork.Api.Entities;

internal class ReadWatchItem
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public required string Url { get; set; }
    public ReadWatchType Type { get; set; } = ReadWatchType.Read;
    public bool IsDone { get; set; }
    public bool IsActive { get; set; } = true;
    public bool? WorthSharing { get; set; }
    public string? Notes { get; set; }
    public DateOnly Date { get; set; }
    public DateOnly? WeekConsumed { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
