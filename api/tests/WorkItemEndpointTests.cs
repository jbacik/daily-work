using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using DailyWork.Api.Entities;
using DailyWork.Api.Tests.Fixtures;
using Xunit;

namespace DailyWork.Api.Tests;

public class WorkItemEndpointTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public WorkItemEndpointTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetWorkItems_ReturnsEmptyList_WhenNoItems()
    {
        var response = await _client.GetAsync("/api/work-items");

        response.EnsureSuccessStatusCode();
        var items = await response.Content.ReadFromJsonAsync<List<WorkItem>>(JsonOptions);
        Assert.NotNull(items);
    }

    [Fact]
    public async Task PostWorkItem_CreatesItem_ReturnsCreated()
    {
        var payload = new { Title = "Test item", Category = "SmallThing" };

        var response = await _client.PostAsJsonAsync("/api/work-items", payload);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var item = await response.Content.ReadFromJsonAsync<WorkItem>(JsonOptions);
        Assert.NotNull(item);
        Assert.Equal("Test item", item.Title);
    }

    [Fact]
    public async Task GetWorkItems_ReturnsCreatedItem()
    {
        var date = DateTime.UtcNow.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        var payload = new { Title = "Integration test item", Category = "BigThing", Date = date };
        await _client.PostAsJsonAsync("/api/work-items", payload);

        var response = await _client.GetAsync($"/api/work-items?date={date}");

        response.EnsureSuccessStatusCode();
        var items = await response.Content.ReadFromJsonAsync<List<WorkItem>>(JsonOptions);
        Assert.NotNull(items);
        Assert.Contains(items, i => i.Title == "Integration test item");
    }
}
