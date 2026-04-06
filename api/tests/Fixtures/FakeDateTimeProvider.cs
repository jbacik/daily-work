using DailyWork.Api;

namespace DailyWork.Api.Tests.Fixtures;

public sealed class FakeDateTimeProvider : IDateTimeProvider
{
    public DateTime UtcNow { get; set; } = DateTime.UtcNow;
}
