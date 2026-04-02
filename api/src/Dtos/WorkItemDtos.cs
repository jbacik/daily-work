namespace DailyWork.Api.Dtos;

public record CreateWorkItemDto(string Title, string? Category, DateTime? Date);
public record UpdateWorkItemDto(string? Title, bool? IsDone);
