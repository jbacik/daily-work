namespace DailyWork.Api.Entities;

internal class ScratchPad
{
	public int Id { get; set; }
	public string? Content { get; set; }
	public bool IsActive { get; set; } = true;
	public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
	public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
