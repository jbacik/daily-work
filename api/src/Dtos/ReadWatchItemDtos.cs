namespace DailyWork.Api.Dtos;

internal record CreateReadWatchItemDto(string Title, string Url, DateTime? Date);

internal record UpdateReadWatchItemDto
{
    public string? Title { get; init; }
    public string? Url { get; init; }
    public bool? IsDone { get; init; }
}
