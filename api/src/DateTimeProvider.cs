namespace DailyWork.Api;

internal interface IDateTimeProvider
{
    DateTime UtcNow { get; }
    DateOnly UtcToday => DateOnly.FromDateTime(UtcNow);
}

internal sealed class SystemDateTimeProvider : IDateTimeProvider
{
    public DateTime UtcNow => DateTime.UtcNow;
}
