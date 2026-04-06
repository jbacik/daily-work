using DailyWork.Api;

namespace DailyWork.Api.Tests.Fixtures;

public sealed class FakeDateTimeProvider : IDateTimeProvider
{
    public DateTime UtcNow { get; set; } = new DateTime(2020, 1, 15, 0, 0, 0, DateTimeKind.Utc);
    public DateOnly UtcToday => DateOnly.FromDateTime(UtcNow);
}
