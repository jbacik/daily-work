using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using DailyWork.Api.Tests.Fixtures;
using Xunit;

namespace DailyWork.Api.Tests;

public class StandupEndpointTests : IClassFixture<CustomWebApplicationFactory>
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

        // Act
        var response = await _client.PostAsync($"/api/standup/generate?weekOf={TestWeekOf}", null);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var markdown = result.GetProperty("markdown").GetString();
        Assert.Contains("Crushed it", markdown!);
    }

    [Fact]
    public async Task GenerateStandup_Returns400_WhenNoItems()
    {
        // Act
        var response = await _client.PostAsync("/api/standup/generate?weekOf=1999-01-04", null);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GenerateStandup_Returns400_WhenWeekOfMissing()
    {
        // Act
        var response = await _client.PostAsync("/api/standup/generate", null);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetStandup_Returns404_WhenNoEntry()
    {
        // Act
        var response = await _client.GetAsync("/api/standup?date=1999-01-01");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
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
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        Assert.Equal("### Did you complete?\nYes!", result.GetProperty("markdown").GetString());

        // Verify via GET
        var getResponse = await _client.GetAsync($"/api/standup?date={uniqueDate}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
        var getResult = await getResponse.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        Assert.Contains("Yes!", getResult.GetProperty("markdown").GetString()!);
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
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var getResponse = await _client.GetAsync($"/api/standup?date={uniqueDate}");
        var result = await getResponse.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        Assert.Contains("Second version", result.GetProperty("markdown").GetString()!);
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
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var markdown = result.GetProperty("markdown").GetString()!;
        Assert.Contains("New content", markdown);
        Assert.DoesNotContain("Old content", markdown);
    }
}
