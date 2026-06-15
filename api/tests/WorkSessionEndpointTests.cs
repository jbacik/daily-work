using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using DailyWork.Api.Entities;
using DailyWork.Api.Tests.Fixtures;
using Shouldly;
using Xunit;

namespace DailyWork.Api.Tests;

public class WorkSessionEndpointTests : IClassFixture<CustomWebApplicationFactory>, IAsyncLifetime
{
	private readonly CustomWebApplicationFactory _factory;
	private readonly HttpClient _client;
	private static readonly JsonSerializerOptions JsonOptions = new()
	{
		PropertyNameCaseInsensitive = true,
		Converters = { new JsonStringEnumConverter() }
	};

	public WorkSessionEndpointTests(CustomWebApplicationFactory factory)
	{
		_factory = factory;
		_client = factory.CreateClient();
	}

	public Task InitializeAsync() => _factory.ResetDatabaseAsync();
	public Task DisposeAsync() => Task.CompletedTask;

	private string Today => _factory.DateTimeProvider.UtcToday.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
	private string GetTodayUrl => $"/api/work-sessions?date={Today}";
	private string ClockInUrl => $"/api/work-sessions/clock-in?date={Today}";
	private string ClockOutUrl => $"/api/work-sessions/clock-out?date={Today}";
	private string PunchUrl => $"/api/work-sessions?date={Today}";

	[Fact]
	public async Task GetToday_Returns204_WhenNoSessionExists()
	{
		// Act
		var response = await _client.GetAsync(GetTodayUrl);

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.NoContent);
	}

	[Fact]
	public async Task GetToday_Returns400_WhenDateMissing()
	{
		// Act
		var response = await _client.GetAsync("/api/work-sessions");

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
	}

	[Fact]
	public async Task GetToday_ReturnsSession_WhenSessionExists()
	{
		// Arrange
		await _client.PostAsJsonAsync(ClockInUrl, new { });

		// Act
		var response = await _client.GetAsync(GetTodayUrl);

		// Assert
		response.EnsureSuccessStatusCode();
		var session = await response.Content.ReadFromJsonAsync<WorkSession>(JsonOptions);
		session.ShouldNotBeNull();
		session.Date.ShouldBe(_factory.DateTimeProvider.UtcToday);
		session.ClockedInAt.ShouldNotBeNull();
		session.ClockedOutAt.ShouldBeNull();
	}

	[Fact]
	public async Task PostClockIn_CreatesSession_WhenNoneExists()
	{
		// Act
		var response = await _client.PostAsJsonAsync(ClockInUrl, new { });

		// Assert
		response.EnsureSuccessStatusCode();
		var session = await response.Content.ReadFromJsonAsync<WorkSession>(JsonOptions);
		session.ShouldNotBeNull();
		session.Date.ShouldBe(_factory.DateTimeProvider.UtcToday);
		session.ClockedInAt.ShouldBe(_factory.DateTimeProvider.UtcNow);
		session.ClockedOutAt.ShouldBeNull();
	}

	[Fact]
	public async Task PostClockIn_IsIdempotent_WhenAlreadyClockedIn()
	{
		// Arrange
		var first = await _client.PostAsJsonAsync(ClockInUrl, new { });
		var firstSession = await first.Content.ReadFromJsonAsync<WorkSession>(JsonOptions);
		firstSession.ShouldNotBeNull();
		var originalClockInAt = firstSession.ClockedInAt;

		// Act — advance the clock and try again; the timestamp should not change
		_factory.DateTimeProvider.UtcNow = _factory.DateTimeProvider.UtcNow.AddHours(1);
		var second = await _client.PostAsJsonAsync(ClockInUrl, new { });

		// Assert
		second.EnsureSuccessStatusCode();
		var secondSession = await second.Content.ReadFromJsonAsync<WorkSession>(JsonOptions);
		secondSession.ShouldNotBeNull();
		secondSession.Id.ShouldBe(firstSession.Id);
		secondSession.ClockedInAt.ShouldBe(originalClockInAt);
	}

	[Fact]
	public async Task PostClockOut_CreatesSession_WhenNoneExists()
	{
		// Act — clock out with no prior clock-in is allowed
		var response = await _client.PostAsJsonAsync(ClockOutUrl, new { });

		// Assert
		response.EnsureSuccessStatusCode();
		var session = await response.Content.ReadFromJsonAsync<WorkSession>(JsonOptions);
		session.ShouldNotBeNull();
		session.Date.ShouldBe(_factory.DateTimeProvider.UtcToday);
		session.ClockedInAt.ShouldBeNull();
		session.ClockedOutAt.ShouldBe(_factory.DateTimeProvider.UtcNow);
	}

	[Fact]
	public async Task PostClockOut_UpdatesSession_WhenClockedIn()
	{
		// Arrange
		await _client.PostAsJsonAsync(ClockInUrl, new { });
		_factory.DateTimeProvider.UtcNow = _factory.DateTimeProvider.UtcNow.AddHours(8);

		// Act
		var response = await _client.PostAsJsonAsync(ClockOutUrl, new { });

		// Assert
		response.EnsureSuccessStatusCode();
		var session = await response.Content.ReadFromJsonAsync<WorkSession>(JsonOptions);
		session.ShouldNotBeNull();
		session.ClockedInAt.ShouldNotBeNull();
		session.ClockedOutAt.ShouldBe(_factory.DateTimeProvider.UtcNow);
	}

	[Fact]
	public async Task PostClockOut_IsIdempotent_WhenAlreadyClockedOut()
	{
		// Arrange
		var first = await _client.PostAsJsonAsync(ClockOutUrl, new { });
		var firstSession = await first.Content.ReadFromJsonAsync<WorkSession>(JsonOptions);
		firstSession.ShouldNotBeNull();
		var originalClockOutAt = firstSession.ClockedOutAt;

		// Act — advance the clock and try again; the timestamp should not change
		_factory.DateTimeProvider.UtcNow = _factory.DateTimeProvider.UtcNow.AddHours(1);
		var second = await _client.PostAsJsonAsync(ClockOutUrl, new { });

		// Assert
		second.EnsureSuccessStatusCode();
		var secondSession = await second.Content.ReadFromJsonAsync<WorkSession>(JsonOptions);
		secondSession.ShouldNotBeNull();
		secondSession.Id.ShouldBe(firstSession.Id);
		secondSession.ClockedOutAt.ShouldBe(originalClockOutAt);
	}

	[Fact]
	public async Task PutPunch_CreatesSession_WhenNoneExists()
	{
		// Arrange
		var clockIn = _factory.DateTimeProvider.UtcNow.AddHours(-8);
		var clockOut = _factory.DateTimeProvider.UtcNow;
		var payload = new { ClockedInAt = clockIn, ClockedOutAt = clockOut };

		// Act
		var response = await _client.PutAsJsonAsync(PunchUrl, payload);

		// Assert
		response.EnsureSuccessStatusCode();
		var session = await response.Content.ReadFromJsonAsync<WorkSession>(JsonOptions);
		session.ShouldNotBeNull();
		session.Date.ShouldBe(_factory.DateTimeProvider.UtcToday);
		session.ClockedInAt.ShouldBe(clockIn);
		session.ClockedOutAt.ShouldBe(clockOut);
	}

	[Fact]
	public async Task PutPunch_UpdatesExistingSession_WithNewTimes()
	{
		// Arrange
		await _client.PostAsJsonAsync(ClockInUrl, new { });
		var newClockIn = _factory.DateTimeProvider.UtcNow.AddHours(-4);
		var newClockOut = _factory.DateTimeProvider.UtcNow;
		var payload = new { ClockedInAt = newClockIn, ClockedOutAt = newClockOut };

		// Act
		var response = await _client.PutAsJsonAsync(PunchUrl, payload);

		// Assert
		response.EnsureSuccessStatusCode();
		var session = await response.Content.ReadFromJsonAsync<WorkSession>(JsonOptions);
		session.ShouldNotBeNull();
		session.ClockedInAt.ShouldBe(newClockIn);
		session.ClockedOutAt.ShouldBe(newClockOut);
	}

	[Fact]
	public async Task PutPunch_ClearsTimestamps_WhenNullsProvided()
	{
		// Arrange
		await _client.PostAsJsonAsync(ClockInUrl, new { });
		var payload = new { ClockedInAt = (DateTime?)null, ClockedOutAt = (DateTime?)null };

		// Act
		var response = await _client.PutAsJsonAsync(PunchUrl, payload);

		// Assert
		response.EnsureSuccessStatusCode();
		var session = await response.Content.ReadFromJsonAsync<WorkSession>(JsonOptions);
		session.ShouldNotBeNull();
		session.ClockedInAt.ShouldBeNull();
		session.ClockedOutAt.ShouldBeNull();
	}

	[Fact]
	public async Task PutPunch_Returns422_WhenClockOutSetWithoutClockIn()
	{
		// Arrange
		var payload = new { ClockedInAt = (DateTime?)null, ClockedOutAt = _factory.DateTimeProvider.UtcNow };

		// Act
		var response = await _client.PutAsJsonAsync(PunchUrl, payload);

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
	}

	[Fact]
	public async Task PutPunch_Returns422_WhenClockOutNotAfterClockIn()
	{
		// Arrange
		var clockIn = _factory.DateTimeProvider.UtcNow;
		var payload = new { ClockedInAt = clockIn, ClockedOutAt = clockIn.AddHours(-1) };

		// Act
		var response = await _client.PutAsJsonAsync(PunchUrl, payload);

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
	}

	[Fact]
	public async Task PutPunch_Returns400_WhenDateMissing()
	{
		// Act
		var response = await _client.PutAsJsonAsync("/api/work-sessions", new { });

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
	}

	[Fact]
	public async Task PutPunch_PersistsReflections_WhenProvided()
	{
		// Arrange
		var clockIn = _factory.DateTimeProvider.UtcNow.AddHours(-8);
		var clockOut = _factory.DateTimeProvider.UtcNow;
		var payload = new
		{
			ClockedInAt = clockIn,
			ClockedOutAt = clockOut,
			Reflections = new { Wins = "Shipped the ceremony", Whines = "Flaky CI", ValueAdds = "Mentored a teammate" }
		};

		// Act
		var response = await _client.PutAsJsonAsync(PunchUrl, payload);

		// Assert
		response.EnsureSuccessStatusCode();
		var session = await response.Content.ReadFromJsonAsync<WorkSession>(JsonOptions);
		session.ShouldNotBeNull();
		session.Reflections.ShouldNotBeNull();
		session.Reflections.Wins.ShouldBe("Shipped the ceremony");
		session.Reflections.Whines.ShouldBe("Flaky CI");
		session.Reflections.ValueAdds.ShouldBe("Mentored a teammate");
	}

	[Fact]
	public async Task PutPunch_StoresReflectionsAsJsonb_WithKeyConstraint()
	{
		// Arrange
		var payload = new
		{
			ClockedInAt = _factory.DateTimeProvider.UtcNow.AddHours(-8),
			ClockedOutAt = _factory.DateTimeProvider.UtcNow,
			Reflections = new { Wins = "A", Whines = "B", ValueAdds = "C" }
		};
		await _client.PutAsJsonAsync(PunchUrl, payload);

		// Act — re-read from the database to confirm the jsonb round-trips
		var response = await _client.GetAsync(GetTodayUrl);

		// Assert
		response.EnsureSuccessStatusCode();
		var session = await response.Content.ReadFromJsonAsync<WorkSession>(JsonOptions);
		session.ShouldNotBeNull();
		session.Reflections.ShouldNotBeNull();
		session.Reflections.Wins.ShouldBe("A");
		session.Reflections.Whines.ShouldBe("B");
		session.Reflections.ValueAdds.ShouldBe("C");
	}

	[Fact]
	public async Task PutPunch_WritesNullReflections_WhenAllFieldsAreWhitespace()
	{
		// Arrange
		var payload = new
		{
			ClockedInAt = _factory.DateTimeProvider.UtcNow.AddHours(-8),
			ClockedOutAt = _factory.DateTimeProvider.UtcNow,
			Reflections = new { Wins = "   ", Whines = "", ValueAdds = (string?)null }
		};
		await _client.PutAsJsonAsync(PunchUrl, payload);

		// Act
		var response = await _client.GetAsync(GetTodayUrl);

		// Assert
		response.EnsureSuccessStatusCode();
		var session = await response.Content.ReadFromJsonAsync<WorkSession>(JsonOptions);
		session.ShouldNotBeNull();
		session.Reflections.ShouldBeNull();
	}

	[Fact]
	public async Task PutPunch_TrimsReflections_WhenSurroundedByWhitespace()
	{
		// Arrange
		var payload = new
		{
			ClockedInAt = _factory.DateTimeProvider.UtcNow.AddHours(-8),
			ClockedOutAt = _factory.DateTimeProvider.UtcNow,
			Reflections = new { Wins = "  shipped it  ", Whines = (string?)null, ValueAdds = (string?)null }
		};

		// Act
		var response = await _client.PutAsJsonAsync(PunchUrl, payload);

		// Assert
		response.EnsureSuccessStatusCode();
		var session = await response.Content.ReadFromJsonAsync<WorkSession>(JsonOptions);
		session.ShouldNotBeNull();
		session.Reflections.ShouldNotBeNull();
		session.Reflections.Wins.ShouldBe("shipped it");
	}

	[Fact]
	public async Task PutPunch_NullsBlankFields_WhenSomeProvided()
	{
		// Arrange — the web client always sends "" for untouched textareas
		var payload = new
		{
			ClockedInAt = _factory.DateTimeProvider.UtcNow.AddHours(-8),
			ClockedOutAt = _factory.DateTimeProvider.UtcNow,
			Reflections = new { Wins = "Shipped it", Whines = "", ValueAdds = "   " }
		};
		await _client.PutAsJsonAsync(PunchUrl, payload);

		// Act
		var response = await _client.GetAsync(GetTodayUrl);

		// Assert — blank fields persist as null, not empty strings
		response.EnsureSuccessStatusCode();
		var session = await response.Content.ReadFromJsonAsync<WorkSession>(JsonOptions);
		session.ShouldNotBeNull();
		session.Reflections.ShouldNotBeNull();
		session.Reflections.Wins.ShouldBe("Shipped it");
		session.Reflections.Whines.ShouldBeNull();
		session.Reflections.ValueAdds.ShouldBeNull();
	}

	[Fact]
	public async Task PutPunch_LeavesReflectionsNull_WhenOmitted()
	{
		// Arrange
		var payload = new { ClockedInAt = _factory.DateTimeProvider.UtcNow.AddHours(-8), ClockedOutAt = _factory.DateTimeProvider.UtcNow };

		// Act
		var response = await _client.PutAsJsonAsync(PunchUrl, payload);

		// Assert
		response.EnsureSuccessStatusCode();
		var session = await response.Content.ReadFromJsonAsync<WorkSession>(JsonOptions);
		session.ShouldNotBeNull();
		session.Reflections.ShouldBeNull();
	}

	[Fact]
	public async Task GetToday_ReturnsReflections_WhenPresent()
	{
		// Arrange
		var payload = new
		{
			ClockedInAt = _factory.DateTimeProvider.UtcNow.AddHours(-8),
			ClockedOutAt = _factory.DateTimeProvider.UtcNow,
			Reflections = new { Wins = "Win", Whines = (string?)null, ValueAdds = (string?)null }
		};
		await _client.PutAsJsonAsync(PunchUrl, payload);

		// Act
		var response = await _client.GetAsync(GetTodayUrl);

		// Assert
		response.EnsureSuccessStatusCode();
		var session = await response.Content.ReadFromJsonAsync<WorkSession>(JsonOptions);
		session.ShouldNotBeNull();
		session.Reflections.ShouldNotBeNull();
		session.Reflections.Wins.ShouldBe("Win");
		session.Reflections.Whines.ShouldBeNull();
		session.Reflections.ValueAdds.ShouldBeNull();
	}
}
