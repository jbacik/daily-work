namespace DailyWork.Api.Dtos;

public record CreateReadWatchItemDto(string Title, string Url, DateTime? Date);
public record UpdateReadWatchItemDto(string? Title, string? Url, bool? IsDone);
