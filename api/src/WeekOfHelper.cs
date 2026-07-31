using System.Globalization;

namespace DailyWork.Api;

internal static class WeekOfHelper
{
	public static string FromDate(DateOnly date)
	{
		int daysToMonday = ((int)date.DayOfWeek - 1 + 7) % 7;
		return date.AddDays(-daysToMonday).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
	}

	public static bool IsValid(string weekOf)
	{
		return DateOnly.TryParseExact(weekOf, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date)
			&& date.DayOfWeek == DayOfWeek.Monday;
	}
}
