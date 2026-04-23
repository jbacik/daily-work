using DailyWork.Api.Enums;

namespace DailyWork.Api.Entities;

internal abstract class UpdateComm
{
	public int Id { get; set; }
	public DateOnly Date { get; set; }
	public required string Markdown { get; set; }
	public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
	public CommType CommType { get; set; }
}

internal class DailyStandupComm : UpdateComm
{
	public DailyStandupComm() { CommType = CommType.DailyStandup; }
}

internal class WeeklyUpdateComm : UpdateComm
{
	public WeeklyUpdateComm() { CommType = CommType.WeeklyUpdate; }
}
