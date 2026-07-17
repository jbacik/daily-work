using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using DailyWork.Api.Prompts;
using DailyWork.Api.Tests.Fixtures;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;
using Shouldly;
using Xunit;

namespace DailyWork.Api.Tests;

public class StandupEndpointTests : IClassFixture<CustomWebApplicationFactory>, IAsyncLifetime
{
	private readonly HttpClient _client;
	private readonly CustomWebApplicationFactory _factory;
	private static readonly JsonSerializerOptions JsonOptions = new()
	{
		PropertyNameCaseInsensitive = true,
		Converters = { new JsonStringEnumConverter() }
	};

	// Fake date is 2020-01-15 (Wednesday); Monday of that week is 2020-01-13
	private const string TestWeekOf = "2020-01-13";

	public StandupEndpointTests(CustomWebApplicationFactory factory)
	{
		_factory = factory;
		_client = factory.CreateClient();
	}

	public Task InitializeAsync() => _factory.ResetDatabaseAsync();
	public Task DisposeAsync() => Task.CompletedTask;

	[Fact]
	public async Task GenerateStandup_ReturnsMarkdown_WhenItemsExist()
	{
		// Arrange
		_factory.ChatCompletionService.ResponseContent = "**Did you complete your One Thing yesterday?**\nCrushed it.";

		// Seed a work item for the test week
		await _client.PostAsJsonAsync("/api/work-items", new
		{
			Title = "Standup test item",
			Category = "SmallThing",
			Date = "2020-01-15",
		});

		// Act — pass today explicitly (client's local date)
		var response = await _client.PostAsync($"/api/standup/generate?weekOf={TestWeekOf}&today=2020-01-15", null);

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var result = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
		var markdown = result.GetProperty("markdown").GetString();
		markdown.ShouldNotBeNull();
		markdown.ShouldContain("Crushed it");
	}

	[Fact]
	public async Task GenerateStandup_IncludesYesterdayDateInPrompt_WhenGenerating()
	{
		// Arrange
		_factory.ChatCompletionService.ResponseContent = "ok";

		await _client.PostAsJsonAsync("/api/work-items", new
		{
			Title = "Yesterday test item",
			Category = "SmallThing",
			Date = "2020-01-14",
		});

		// Act — today is Wednesday 2020-01-15, so yesterday should be 2020-01-14
		var response = await _client.PostAsync($"/api/standup/generate?weekOf={TestWeekOf}&today=2020-01-15", null);

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var userMessage = _factory.ChatCompletionService.LastChatHistory!
			.Last(m => m.Role == AuthorRole.User)
			.Content!;
		userMessage.ShouldContain("Today's date: 2020-01-15");
		userMessage.ShouldContain("Yesterday's date: 2020-01-14");
	}

	[Fact]
	public async Task GenerateStandup_RollsYesterdayBackToFriday_WhenTodayIsMonday()
	{
		// Arrange
		_factory.ChatCompletionService.ResponseContent = "ok";

		// Seed a work item in the Monday week so items.Count > 0
		await _client.PostAsJsonAsync("/api/work-items", new
		{
			Title = "Monday item",
			Category = "SmallThing",
			Date = "2020-01-20",
		});

		// Act — today is Monday 2020-01-20, yesterday should roll back to Friday 2020-01-17
		var response = await _client.PostAsync("/api/standup/generate?weekOf=2020-01-20&today=2020-01-20", null);

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var userMessage = _factory.ChatCompletionService.LastChatHistory!
			.Last(m => m.Role == AuthorRole.User)
			.Content!;
		userMessage.ShouldContain("Today's date: 2020-01-20");
		userMessage.ShouldContain("Yesterday's date: 2020-01-17");
	}

	[Fact]
	public async Task GenerateStandup_FallsBackToUtc_WhenTodayNotProvided()
	{
		// Arrange
		_factory.ChatCompletionService.ResponseContent = "Fallback test";

		await _client.PostAsJsonAsync("/api/work-items", new
		{
			Title = "Fallback item",
			Category = "SmallThing",
			Date = "2020-01-15",
		});

		// Act — omit today param
		var response = await _client.PostAsync($"/api/standup/generate?weekOf={TestWeekOf}", null);

		// Assert — should still succeed using UtcToday fallback
		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var result = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
		result.GetProperty("markdown").GetString().ShouldNotBeNull();
	}

	[Fact]
	public async Task GenerateStandup_Returns400_WhenNoItems()
	{
		// Act
		var response = await _client.PostAsync("/api/standup/generate?weekOf=1999-01-04", null);

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
	}

	[Fact]
	public async Task GenerateStandup_Returns400_WhenWeekOfMissing()
	{
		// Act
		var response = await _client.PostAsync("/api/standup/generate", null);

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
	}

	[Fact]
	public async Task GetStandup_Returns404_WhenNoEntry()
	{
		// Act
		var response = await _client.GetAsync("/api/standup?date=1999-01-01");

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
	}

	[Fact]
	public async Task SaveStandup_CreatesEntry_WhenNew()
	{
		// Arrange
		var uniqueDate = "2020-02-01";

		// Act
		var response = await _client.PostAsJsonAsync("/api/standup", new
		{
			Markdown = "### Did you complete?\nYes!",
			Date = uniqueDate,
		});

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var result = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
		result.GetProperty("markdown").GetString().ShouldBe("### Did you complete?\nYes!");

		// Verify via GET
		var getResponse = await _client.GetAsync($"/api/standup?date={uniqueDate}");
		getResponse.StatusCode.ShouldBe(HttpStatusCode.OK);
		var getResult = await getResponse.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
		getResult.GetProperty("markdown").GetString()!.ShouldContain("Yes!");
	}

	[Fact]
	public async Task GenerateWeeklySummary_PersistsAndReturnsMarkdown_WhenDailyCommsExist()
	{
		// Arrange
		_factory.ChatCompletionService.ResponseContent = "### Weekly recap\nStrong week overall.";

		var weekOf = "2020-03-09"; // Monday
		await _client.PostAsJsonAsync("/api/standup", new
		{
			Markdown = "Tuesday highlights",
			Date = "2020-03-10",
		});

		// Act
		var response = await _client.PostAsync($"/api/standup/generate-weekly-summary?weekOf={weekOf}", null);

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var result = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
		result.GetProperty("markdown").GetString()!.ShouldContain("Strong week");

		// Verify persisted — GET with commandType=weekly-summary
		var getResponse = await _client.GetAsync($"/api/standup?date={weekOf}&commandType=weekly-summary");
		getResponse.StatusCode.ShouldBe(HttpStatusCode.OK);
		var getResult = await getResponse.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
		getResult.GetProperty("markdown").GetString()!.ShouldContain("Strong week");
	}

	[Fact]
	public async Task GenerateWeeklySummary_Returns400_WhenWeekOfMissing()
	{
		// Act
		var response = await _client.PostAsync("/api/standup/generate-weekly-summary", null);

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
	}

	[Fact]
	public async Task SaveStandup_UpdatesEntry_WhenExisting()
	{
		// Arrange
		var uniqueDate = "2020-02-02";
		await _client.PostAsJsonAsync("/api/standup", new
		{
			Markdown = "### Original\nFirst version",
			Date = uniqueDate,
		});

		// Act
		var response = await _client.PostAsJsonAsync("/api/standup", new
		{
			Markdown = "### Updated\nSecond version",
			Date = uniqueDate,
		});

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var getResponse = await _client.GetAsync($"/api/standup?date={uniqueDate}");
		var result = await getResponse.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
		result.GetProperty("markdown").GetString()!.ShouldContain("Second version");
	}

	[Fact]
	public async Task GenerateStandup_IncludesSyncMeetingsInContext_WhenForecastStored()
	{
		// Arrange
		_factory.ChatCompletionService.ResponseContent = "ok";

		var forecastJson = """{"date":"2020-01-15","syncMeetings":["Ali / Jared"],"upcomingPTO":[]}""";
		await _client.PostAsJsonAsync("/api/forecast?date=2020-01-15", new { Json = forecastJson });

		await _client.PostAsJsonAsync("/api/work-items", new
		{
			Title = "Forecast prompt item",
			Category = "SmallThing",
			Date = "2020-01-15",
		});

		// Act
		var response = await _client.PostAsync($"/api/standup/generate?weekOf={TestWeekOf}&today=2020-01-15", null);

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var userMessage = _factory.ChatCompletionService.LastChatHistory!
			.Last(m => m.Role == AuthorRole.User)
			.Content!;
		userMessage.ShouldContain("Standup context:");
		userMessage.ShouldContain("\"syncMeetings\":[\"Ali / Jared\"]");
	}

	[Fact]
	public async Task GenerateStandup_SendsEmptyForecastArrays_WhenNoForecastStored()
	{
		// Arrange
		_factory.ChatCompletionService.ResponseContent = "ok";

		await _client.PostAsJsonAsync("/api/work-items", new
		{
			Title = "No forecast item",
			Category = "SmallThing",
			Date = "2020-01-15",
		});

		// Act
		var response = await _client.PostAsync($"/api/standup/generate?weekOf={TestWeekOf}&today=2020-01-15", null);

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var userMessage = _factory.ChatCompletionService.LastChatHistory!
			.Last(m => m.Role == AuthorRole.User)
			.Content!;
		userMessage.ShouldContain("\"syncMeetings\":[]");
		userMessage.ShouldContain("\"upcomingPTO\":[]");
	}

	[Fact]
	public async Task GenerateStandup_OmitsForecast_WhenWeeklyCommandType()
	{
		// Arrange
		_factory.ChatCompletionService.ResponseContent = "ok";

		var forecastJson = """{"date":"2020-01-15","syncMeetings":["Ali / Jared"],"upcomingPTO":[]}""";
		await _client.PostAsJsonAsync("/api/forecast?date=2020-01-15", new { Json = forecastJson });

		await _client.PostAsJsonAsync("/api/work-items", new
		{
			Title = "Weekly forecast item",
			Category = "SmallThing",
			Date = "2020-01-15",
		});

		// Act
		var response = await _client.PostAsync($"/api/standup/generate?weekOf={TestWeekOf}&today=2020-01-15&commandType=weekly", null);

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var userMessage = _factory.ChatCompletionService.LastChatHistory!
			.Last(m => m.Role == AuthorRole.User)
			.Content!;
		userMessage.ShouldNotContain("Ali / Jared");
		userMessage.ShouldNotContain("Standup context:");
	}

	[Fact]
	public async Task GenerateStandup_IncludesWeeklyGoalInContext_WhenBigThingExists()
	{
		// Arrange
		_factory.ChatCompletionService.ResponseContent = "ok";

		await _client.PostAsJsonAsync("/api/work-items", new
		{
			Title = "Insights platform buildout",
			Category = "BigThing",
			Date = "2020-01-13",
		});
		await _client.PostAsJsonAsync("/api/work-items", new
		{
			Title = "Goal test item",
			Category = "SmallThing",
			Date = "2020-01-15",
		});

		// Act
		var response = await _client.PostAsync($"/api/standup/generate?weekOf={TestWeekOf}&today=2020-01-15", null);

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var userMessage = _factory.ChatCompletionService.LastChatHistory!
			.Last(m => m.Role == AuthorRole.User)
			.Content!;
		userMessage.ShouldContain("\"weeklyGoal\":\"Insights platform buildout\"");
	}

	[Fact]
	public async Task GenerateStandup_OmitsGoalAndInjectsNoGoalDirective_WhenNoBigThing()
	{
		// Arrange
		_factory.ChatCompletionService.ResponseContent = "ok";

		await _client.PostAsJsonAsync("/api/work-items", new
		{
			Title = "No goal item",
			Category = "SmallThing",
			Date = "2020-01-15",
		});

		// Act
		var response = await _client.PostAsync($"/api/standup/generate?weekOf={TestWeekOf}&today=2020-01-15", null);

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var userMessage = _factory.ChatCompletionService.LastChatHistory!
			.Last(m => m.Role == AuthorRole.User)
			.Content!;
		// Null members are omitted from the payload so a small model never echoes a literal "null".
		userMessage.ShouldNotContain("\"weeklyGoal\"");
		userMessage.ShouldContain("no weekly goal this week");
	}

	[Fact]
	public async Task GenerateStandup_InjectsOpener_WhenYesterdayItemExists()
	{
		// Arrange
		_factory.ChatCompletionService.ResponseContent = "ok";

		await _client.PostAsJsonAsync("/api/work-items", new
		{
			Title = "Unfinished yesterday item",
			Category = "SmallThing",
			Date = "2020-01-14",
		});

		// Act
		var response = await _client.PostAsync($"/api/standup/generate?weekOf={TestWeekOf}&today=2020-01-15", null);

		// Assert — item is not done, so the opener comes from the NotDone bucket
		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var userMessage = _factory.ChatCompletionService.LastChatHistory!
			.Last(m => m.Role == AuthorRole.User)
			.Content!;
		userMessage.ShouldContain("Open the first answer with exactly:");
		StandupPrompts.NotDoneOpeners
			.Any(o => userMessage.Contains($"Open the first answer with exactly: \"{o}\""))
			.ShouldBeTrue();
	}

	[Fact]
	public async Task GenerateStandup_OmitsOpener_WhenNoYesterdayItems()
	{
		// Arrange
		_factory.ChatCompletionService.ResponseContent = "ok";

		await _client.PostAsJsonAsync("/api/work-items", new
		{
			Title = "Today only item",
			Category = "SmallThing",
			Date = "2020-01-15",
		});

		// Act
		var response = await _client.PostAsync($"/api/standup/generate?weekOf={TestWeekOf}&today=2020-01-15", null);

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var userMessage = _factory.ChatCompletionService.LastChatHistory!
			.Last(m => m.Role == AuthorRole.User)
			.Content!;
		userMessage.ShouldNotContain("Open the first answer");
	}

	[Fact]
	public async Task GenerateStandup_MarksOneThingCarried_WhenYesterdayItemMovedToToday()
	{
		// Arrange — create an item dated yesterday, then move it to today
		_factory.ChatCompletionService.ResponseContent = "ok";

		var createResponse = await _client.PostAsJsonAsync("/api/work-items", new
		{
			Title = "Carried item",
			Category = "SmallThing",
			Date = "2020-01-14",
		});
		var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
		var id = created.GetProperty("id").GetInt32();

		await _client.PatchAsJsonAsync($"/api/work-items/{id}/move", new { Date = "2020-01-15" });

		// Act
		var response = await _client.PostAsync($"/api/standup/generate?weekOf={TestWeekOf}&today=2020-01-15", null);

		// Assert — the moved item is yesterday's One Thing with carried status, opener from Partial bucket
		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var userMessage = _factory.ChatCompletionService.LastChatHistory!
			.Last(m => m.Role == AuthorRole.User)
			.Content!;
		userMessage.ShouldContain("""{"title":"Carried item","status":"carried"}""");
		StandupPrompts.PartialOpeners
			.Any(o => userMessage.Contains($"Open the first answer with exactly: \"{o}\""))
			.ShouldBeTrue();
	}

	[Fact]
	public async Task GenerateStandup_PassesTemperature_WhenGenerating()
	{
		// Arrange
		_factory.ChatCompletionService.ResponseContent = "ok";

		await _client.PostAsJsonAsync("/api/work-items", new
		{
			Title = "Temperature test item",
			Category = "SmallThing",
			Date = "2020-01-15",
		});

		// Act
		var response = await _client.PostAsync($"/api/standup/generate?weekOf={TestWeekOf}&today=2020-01-15", null);

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var settings = _factory.ChatCompletionService.LastExecutionSettings
			.ShouldBeOfType<OpenAIPromptExecutionSettings>();
		settings.Temperature.ShouldBe(0.35);
	}

	[Fact]
	public async Task GenerateStandup_SendsEmptyForecastArrays_WhenForecastNotAnObject()
	{
		// Arrange — the forecast endpoint only validates that the text is JSON, so a
		// non-object payload can reach the standup parser
		_factory.ChatCompletionService.ResponseContent = "ok";

		await _client.PostAsJsonAsync("/api/forecast?date=2020-01-15", new { Json = "[1,2,3]" });

		await _client.PostAsJsonAsync("/api/work-items", new
		{
			Title = "Bad forecast item",
			Category = "SmallThing",
			Date = "2020-01-15",
		});

		// Act
		var response = await _client.PostAsync($"/api/standup/generate?weekOf={TestWeekOf}&today=2020-01-15", null);

		// Assert — generation still succeeds with empty forecast data
		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var userMessage = _factory.ChatCompletionService.LastChatHistory!
			.Last(m => m.Role == AuthorRole.User)
			.Content!;
		userMessage.ShouldContain("\"syncMeetings\":[]");
	}

	[Fact]
	public async Task GetStandup_ReturnsEntryForSpecificDate_WhenMultipleDatesExist()
	{
		// Arrange: save standups for two different dates
		var olderDate = "2020-03-01";
		var newerDate = "2020-03-10";

		await _client.PostAsJsonAsync("/api/standup", new
		{
			Markdown = "### Old standup\nOld content.",
			Date = olderDate,
		});

		await _client.PostAsJsonAsync("/api/standup", new
		{
			Markdown = "### New standup\nNew content.",
			Date = newerDate,
		});

		// Act: query for the newer date only
		var response = await _client.GetAsync($"/api/standup?date={newerDate}");

		// Assert: should return the queried date's entry, not the oldest
		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var result = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
		var markdown = result.GetProperty("markdown").GetString()!;
		markdown.ShouldContain("New content");
		markdown.ShouldNotContain("Old content");
	}
}
