using DailyWork.Api.Enums;

namespace DailyWork.Api.Entities;

public class WorkItem
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public WorkItemCategory Category { get; set; } = WorkItemCategory.SmallThing;
    public bool IsDone { get; set; }
    public DateTime Date { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
