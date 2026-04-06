namespace DailyWork.Api;

internal interface IDateTimeProvider
{
    DateTime UtcNow { get; }
}

internal sealed class SystemDateTimeProvider : IDateTimeProvider
{
    public DateTime UtcNow => DateTime.UtcNow;
}
