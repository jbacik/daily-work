namespace DailyWork.Api.Dtos;

internal record CreateWorkItemDto(string Title, string? Category, DateOnly? Date);

internal record UpdateWorkItemDto
{
	public string? Title { get; init; }
	public bool? IsDone { get; init; }
}
