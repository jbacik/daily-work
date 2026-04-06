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

    private readonly CustomWebApplicationFactory _factory;

    // Fake date is 2020-01-15 (Wednesday); Monday of that week is 2020-01-13
    private const string TestWeekOf = "2020-01-13";

    public WorkItemEndpointTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetWorkItems_ReturnsEmptyList_WhenNoItemsForWeek()
    {
        var response = await _client.GetAsync($"/api/work-items?weekOf=1990-01-01");

        response.EnsureSuccessStatusCode();
        var items = await response.Content.ReadFromJsonAsync<List<WorkItem>>(JsonOptions);
        Assert.NotNull(items);
        Assert.Empty(items);
    }

    [Fact]
    public async Task GetWorkItems_Returns400_WhenWeekOfMissing()
    {
        var response = await _client.GetAsync("/api/work-items");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
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
    public async Task PostWorkItem_SetsWeekOf_Automatically()
    {
        var date = _factory.DateTimeProvider.UtcToday.ToString("O", System.Globalization.CultureInfo.InvariantCulture);
        var payload = new { Title = "WeekOf test item", Category = "SmallThing", Date = date };

        var response = await _client.PostAsJsonAsync("/api/work-items", payload);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var item = await response.Content.ReadFromJsonAsync<WorkItem>(JsonOptions);
        Assert.NotNull(item);
        Assert.Equal(TestWeekOf, item.WeekOf);
    }

    [Fact]
    public async Task GetWorkItems_ReturnsItemsForWeek()
    {
        var date = _factory.DateTimeProvider.UtcToday.ToString("O", System.Globalization.CultureInfo.InvariantCulture);
        var payload = new { Title = "Week filter test item", Category = "SmallThing", Date = date };
        await _client.PostAsJsonAsync("/api/work-items", payload);

        var response = await _client.GetAsync($"/api/work-items?weekOf={TestWeekOf}");

        response.EnsureSuccessStatusCode();
        var items = await response.Content.ReadFromJsonAsync<List<WorkItem>>(JsonOptions);
        Assert.NotNull(items);
        Assert.Contains(items, i => i.Title == "Week filter test item");
    }

    [Fact]
    public async Task PostWorkItem_Returns422_WhenDayHas5SmallThingItems()
    {
        var date = new DateOnly(2020, 1, 14).ToString("O", System.Globalization.CultureInfo.InvariantCulture);

        for (var i = 0; i < 5; i++)
        {
            var r = await _client.PostAsJsonAsync("/api/work-items", new { Title = $"Cap test {i}", Category = "SmallThing", Date = date });
            r.EnsureSuccessStatusCode();
        }

        var response = await _client.PostAsJsonAsync("/api/work-items", new { Title = "Over cap", Category = "SmallThing", Date = date });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
    }

    [Fact]
    public async Task PromoteWorkItem_DemotesExistingBigThing_WhenSameWeek()
    {
        // Create two SmallThing items on different days in the same week
        // Use Mon/Thu to avoid collisions with cap test (2020-01-14) and default date tests (2020-01-15)
        var day1 = new DateOnly(2020, 1, 13).ToString("O", System.Globalization.CultureInfo.InvariantCulture);
        var day2 = new DateOnly(2020, 1, 16).ToString("O", System.Globalization.CultureInfo.InvariantCulture);

        var r1 = await _client.PostAsJsonAsync("/api/work-items", new { Title = "Big thing candidate 1", Category = "SmallThing", Date = day1 });
        var item1 = await r1.Content.ReadFromJsonAsync<WorkItem>(JsonOptions);

        var r2 = await _client.PostAsJsonAsync("/api/work-items", new { Title = "Big thing candidate 2", Category = "SmallThing", Date = day2 });
        var item2 = await r2.Content.ReadFromJsonAsync<WorkItem>(JsonOptions);

        // Promote first item to BigThing
        await _client.PutAsync($"/api/work-items/{item1!.Id}/promote", null);

        // Promote second item — first should be demoted to SmallThing
        var promoteResponse = await _client.PutAsync($"/api/work-items/{item2!.Id}/promote", null);
        promoteResponse.EnsureSuccessStatusCode();

        // Fetch the week and verify only item2 is BigThing
        var getResponse = await _client.GetAsync($"/api/work-items?weekOf={TestWeekOf}");
        var items = await getResponse.Content.ReadFromJsonAsync<List<WorkItem>>(JsonOptions);
        Assert.NotNull(items);
        Assert.DoesNotContain(items, i => i.Id == item1.Id && i.Category.ToString() == "BigThing");
        Assert.Contains(items, i => i.Id == item2.Id && i.Category.ToString() == "BigThing");
    }
}
