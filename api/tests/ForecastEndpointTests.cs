using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using DailyWork.Api.Tests.Fixtures;
using Shouldly;
using Xunit;

namespace DailyWork.Api.Tests;

public class ForecastEndpointTests : IClassFixture<CustomWebApplicationFactory>, IAsyncLifetime
{
	private readonly CustomWebApplicationFactory _factory;
	private readonly HttpClient _client;
	private readonly string _forecastDir;
	private static readonly JsonSerializerOptions JsonOptions = new()
	{
		PropertyNameCaseInsensitive = true,
		Converters = { new JsonStringEnumConverter() }
	};

	private const string TestDate = "2020-01-15";
	private const string TestFileName = "daily-forecast-2020-01-15.json";
	private const string SampleJson = """{"date":"2020-01-15","dayOfWeek":"Wednesday","meetings":{"count":2,"totalHours":1.5}}""";

	public ForecastEndpointTests(CustomWebApplicationFactory factory)
	{
		_factory = factory;
		_forecastDir = Directory.CreateTempSubdirectory("forecast-tests").FullName;
		_client = factory.WithWebHostBuilder(b =>
			b.UseSetting("CalendarForecasts:Directory", _forecastDir)).CreateClient();
	}

	public Task InitializeAsync() => _factory.ResetDatabaseAsync();

	public Task DisposeAsync()
	{
		Directory.Delete(_forecastDir, recursive: true);
		return Task.CompletedTask;
	}

	private Task WriteForecastFileAsync(string content) =>
		File.WriteAllTextAsync(Path.Combine(_forecastDir, TestFileName), content);

	[Fact]
	public async Task GetForecast_ReturnsJsonAndFileName_WhenFileExistsOnDisk()
	{
		// Arrange
		await WriteForecastFileAsync(SampleJson);

		// Act
		var response = await _client.GetAsync($"/api/forecast?date={TestDate}");

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var result = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
		result.GetProperty("json").GetString().ShouldBe(SampleJson);
		result.GetProperty("fileName").GetString().ShouldBe(TestFileName);
		result.GetProperty("source").GetString().ShouldBe("file");
	}

	[Fact]
	public async Task GetForecast_PersistsToWorkSession_WhenFileFound()
	{
		// Arrange
		await WriteForecastFileAsync(SampleJson);
		await _client.GetAsync($"/api/forecast?date={TestDate}");
		File.Delete(Path.Combine(_forecastDir, TestFileName));

		// Act — file is gone, so a 200 can only come from the database
		var response = await _client.GetAsync($"/api/forecast?date={TestDate}");

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var result = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
		result.GetProperty("json").GetString().ShouldBe(SampleJson);
		result.GetProperty("source").GetString().ShouldBe("database");
	}

	[Fact]
	public async Task GetForecast_CreatesWorkSessionRow_WhenNoneExists()
	{
		// Arrange
		await WriteForecastFileAsync(SampleJson);

		// Act
		await _client.GetAsync($"/api/forecast?date={TestDate}");

		// Assert
		var sessionResponse = await _client.GetAsync($"/api/work-sessions?date={TestDate}");
		sessionResponse.StatusCode.ShouldBe(HttpStatusCode.OK);
		var session = await sessionResponse.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
		session.GetProperty("calendarForecastJson").GetString().ShouldBe(SampleJson);
	}

	[Fact]
	public async Task GetForecast_ReturnsStoredJson_WhenAlreadyInDatabase()
	{
		// Arrange — seed via upload, no file on disk
		await _client.PostAsJsonAsync($"/api/forecast?date={TestDate}", new { Json = SampleJson });

		// Act
		var response = await _client.GetAsync($"/api/forecast?date={TestDate}");

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var result = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
		result.GetProperty("json").GetString().ShouldBe(SampleJson);
		result.GetProperty("source").GetString().ShouldBe("database");
	}

	[Fact]
	public async Task GetForecast_ReturnsNotFound_WhenNoFileAndNoDbValue()
	{
		// Act
		var response = await _client.GetAsync($"/api/forecast?date={TestDate}");

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
	}

	[Fact]
	public async Task GetForecast_ReturnsProblem_WhenFileContainsInvalidJson()
	{
		// Arrange
		await WriteForecastFileAsync("{ not json");

		// Act
		var response = await _client.GetAsync($"/api/forecast?date={TestDate}");

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);

		// Nothing persisted — the work session row was never created
		var sessionResponse = await _client.GetAsync($"/api/work-sessions?date={TestDate}");
		sessionResponse.StatusCode.ShouldBe(HttpStatusCode.NoContent);
	}

	[Fact]
	public async Task PostForecast_StoresJson_WhenBodyIsValid()
	{
		// Act
		var response = await _client.PostAsJsonAsync($"/api/forecast?date={TestDate}", new { Json = SampleJson });

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var result = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
		result.GetProperty("json").GetString().ShouldBe(SampleJson);
		result.GetProperty("source").GetString().ShouldBe("upload");

		var getResponse = await _client.GetAsync($"/api/forecast?date={TestDate}");
		getResponse.StatusCode.ShouldBe(HttpStatusCode.OK);
	}

	[Fact]
	public async Task PostForecast_OverwritesExisting_WhenForecastAlreadyStored()
	{
		// Arrange
		await _client.PostAsJsonAsync($"/api/forecast?date={TestDate}", new { Json = SampleJson });
		var updatedJson = """{"date":"2020-01-15","meetings":{"count":5,"totalHours":4.0}}""";

		// Act
		var response = await _client.PostAsJsonAsync($"/api/forecast?date={TestDate}", new { Json = updatedJson });

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var getResponse = await _client.GetAsync($"/api/forecast?date={TestDate}");
		var result = await getResponse.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
		result.GetProperty("json").GetString().ShouldBe(updatedJson);
	}

	[Fact]
	public async Task PostForecast_ReturnsProblem_WhenJsonInvalid()
	{
		// Act
		var response = await _client.PostAsJsonAsync($"/api/forecast?date={TestDate}", new { Json = "{ not json" });

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
	}

	[Fact]
	public async Task DeleteForecast_ClearsColumnOnly_WhenForecastStored()
	{
		// Arrange
		await _client.PostAsJsonAsync($"/api/forecast?date={TestDate}", new { Json = SampleJson });

		// Act
		var response = await _client.DeleteAsync($"/api/forecast?date={TestDate}");

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.NoContent);

		var getResponse = await _client.GetAsync($"/api/forecast?date={TestDate}");
		getResponse.StatusCode.ShouldBe(HttpStatusCode.NotFound);

		// The work session row itself survives with the column cleared
		var sessionResponse = await _client.GetAsync($"/api/work-sessions?date={TestDate}");
		sessionResponse.StatusCode.ShouldBe(HttpStatusCode.OK);
		var session = await sessionResponse.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
		session.GetProperty("calendarForecastJson").ValueKind.ShouldBe(JsonValueKind.Null);
	}

	[Fact]
	public async Task DeleteForecast_ReturnsNoContent_WhenNoRowExists()
	{
		// Act
		var response = await _client.DeleteAsync($"/api/forecast?date={TestDate}");

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.NoContent);
	}
}
