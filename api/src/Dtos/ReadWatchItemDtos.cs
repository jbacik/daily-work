namespace DailyWork.Api.Dtos;

internal record CreateReadWatchItemDto(string Text, string? Type, DateOnly? Date, bool? IsActive);

internal record UpdateReadWatchItemDto
{
    public string? Title { get; init; }
    public string? Url { get; init; }
    public bool? IsActive { get; init; }
}

internal record ConsumeReadWatchItemDto(bool WorthSharing, string Notes, DateOnly WeekOf);
