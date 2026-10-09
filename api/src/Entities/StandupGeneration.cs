using DailyWork.Api.Enums;

namespace DailyWork.Api.Entities;

// A raw model draft from /api/standup/generate, kept so it can be paired with the
// edited markdown the user actually saved (UpdateComm.GenerationId) for prompt tuning.
internal class StandupGeneration
{
	public int Id { get; set; }
	public DateOnly Date { get; set; }
	public CommType CommType { get; set; }
	public required string PromptVariant { get; set; }
	public required string SystemPrompt { get; set; }
	public required string UserMessage { get; set; }
	public required string GeneratedMarkdown { get; set; }
	public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
