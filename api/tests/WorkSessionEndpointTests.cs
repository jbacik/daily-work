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
}
