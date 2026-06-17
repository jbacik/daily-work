namespace DailyWork.Api.Dtos;

internal record PunchWorkSessionDto
{
	public DateTime? ClockedInAt { get; init; }
	public DateTime? ClockedOutAt { get; init; }
	public ReflectionsDto? Reflections { get; init; }
}

internal record ReflectionsDto
{
	public string? Wins { get; init; }
	public string? Whines { get; init; }
	public string? ValueAdds { get; init; }
}
