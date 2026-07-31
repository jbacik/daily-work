namespace DailyWork.Api.Dtos;

internal record CreateWorkMetricDefinitionDto(string Title);

internal record UpdateWorkMetricDefinitionDto
{
	public string? Title { get; init; }
	public bool? IsActive { get; init; }
	public int? SortOrder { get; init; }
}

internal record UpsertWorkMetricEntryDto(string WeekOf, string Title, string? Value);

internal record CreateWorkMetricEntryDto(string WeekOf, string Title, string? Value);

internal record UpdateWorkMetricEntryDto
{
	public string? Title { get; init; }
	public string? Value { get; init; }
}
