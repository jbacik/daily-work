using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using DailyWork.Api.Entities;
using DailyWork.Api.Tests.Fixtures;
using Xunit;

namespace DailyWork.Api.Tests;

public class ReadWatchEndpointTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public ReadWatchEndpointTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task PostReadWatch_ParsesUrlFromText_ReturnsCreated()
    {
        var response = await _client.PostAsJsonAsync("/api/read-watch", new
        {
            Text = "Interesting article https://example.com/article",
            Type = "Read",
            Date = "2019-01-01"
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var item = await response.Content.ReadFromJsonAsync<ReadWatchItem>(JsonOptions);
        Assert.NotNull(item);
        Assert.Equal("Interesting article", item.Title);
        Assert.Equal("https://example.com/article", item.Url);
    }

    [Fact]
    public async Task PostReadWatch_NoUrl_StoresTitleOnly()
    {
        var response = await _client.PostAsJsonAsync("/api/read-watch", new
        {
            Text = "Learn about design patterns",
            Type = "Learn",
            Date = "2019-01-02"
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var item = await response.Content.ReadFromJsonAsync<ReadWatchItem>(JsonOptions);
        Assert.NotNull(item);
        Assert.Equal("Learn about design patterns", item.Title);
        Assert.Equal(string.Empty, item.Url);
    }

    [Fact]
    public async Task PostReadWatch_UrlOnly_UsesUrlAsTitle()
    {
        var response = await _client.PostAsJsonAsync("/api/read-watch", new
        {
            Text = "https://example.com/video",
            Type = "Watch",
            Date = "2019-01-03"
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var item = await response.Content.ReadFromJsonAsync<ReadWatchItem>(JsonOptions);
        Assert.NotNull(item);
        Assert.Equal("https://example.com/video", item.Title);
        Assert.Equal("https://example.com/video", item.Url);
    }

    [Fact]
    public async Task PostReadWatch_StoresType_ReturnsInResponse()
    {
        var response = await _client.PostAsJsonAsync("/api/read-watch", new
        {
            Text = "TypeScript deep dive",
            Type = "Learn",
            Date = "2019-01-04"
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var item = await response.Content.ReadFromJsonAsync<ReadWatchItem>(JsonOptions);
        Assert.NotNull(item);
        Assert.Equal("Learn", item.Type.ToString());
    }

    [Fact]
    public async Task GetReadWatch_ByDate_ReturnsOnlyActiveNotDone()
    {
        var testDate = "2019-02-01";

        // Arrange — create an active item and a backlogged item
        await _client.PostAsJsonAsync("/api/read-watch", new
        {
            Text = "active-date-filter-test",
            Type = "Read",
            Date = testDate
        });

        var backlogResp = await _client.PostAsJsonAsync("/api/read-watch", new
        {
            Text = "backlog-date-filter-test",
            Type = "Read",
            Date = testDate
        });
        var backlogItem = await backlogResp.Content.ReadFromJsonAsync<ReadWatchItem>(JsonOptions);
        await _client.PutAsJsonAsync($"/api/read-watch/{backlogItem!.Id}", new { IsActive = false });

        // Act
        var response = await _client.GetAsync($"/api/read-watch?date={testDate}");

        // Assert
        response.EnsureSuccessStatusCode();
        var items = await response.Content.ReadFromJsonAsync<List<ReadWatchItem>>(JsonOptions);
        Assert.NotNull(items);
        Assert.Contains(items, i => i.Title == "active-date-filter-test");
        Assert.DoesNotContain(items, i => i.Title == "backlog-date-filter-test");
    }

    [Fact]
    public async Task GetReadWatch_ByWeekOf_ReturnsAllNotDoneAndConsumedThatWeek()
    {
        var testDate = "2019-03-06"; // Wednesday
        var testWeekOf = "2019-03-04"; // Monday

        // Arrange — create an active item
        await _client.PostAsJsonAsync("/api/read-watch", new
        {
            Text = "weekof-active-test",
            Type = "Read",
            Date = testDate
        });

        // Create and consume an item this week
        var consumeResp = await _client.PostAsJsonAsync("/api/read-watch", new
        {
            Text = "weekof-consumed-test",
            Type = "Read",
            Date = testDate
        });
        var consumeItem = await consumeResp.Content.ReadFromJsonAsync<ReadWatchItem>(JsonOptions);
        await _client.PutAsJsonAsync($"/api/read-watch/{consumeItem!.Id}/consume", new
        {
            WorthSharing = true,
            Notes = "Great stuff",
            WeekOf = testWeekOf
        });

        // Act
        var response = await _client.GetAsync($"/api/read-watch?weekOf={testWeekOf}");

        // Assert
        response.EnsureSuccessStatusCode();
        var items = await response.Content.ReadFromJsonAsync<List<ReadWatchItem>>(JsonOptions);
        Assert.NotNull(items);
        Assert.Contains(items, i => i.Title == "weekof-active-test");
        Assert.Contains(items, i => i.Title == "weekof-consumed-test");
    }

    [Fact]
    public async Task GetReadWatch_ByWeekOf_ExcludesConsumedOtherWeeks()
    {
        var otherWeekOf = "2019-04-01"; // a different week
        var queryWeekOf = "2019-05-06"; // the week we query

        // Arrange — create and consume an item for a different week
        var resp = await _client.PostAsJsonAsync("/api/read-watch", new
        {
            Text = "other-week-consumed-test",
            Type = "Read",
            Date = "2019-04-02"
        });
        var item = await resp.Content.ReadFromJsonAsync<ReadWatchItem>(JsonOptions);
        await _client.PutAsJsonAsync($"/api/read-watch/{item!.Id}/consume", new
        {
            WorthSharing = false,
            Notes = "Old item",
            WeekOf = otherWeekOf
        });

        // Act
        var response = await _client.GetAsync($"/api/read-watch?weekOf={queryWeekOf}");

        // Assert
        response.EnsureSuccessStatusCode();
        var items = await response.Content.ReadFromJsonAsync<List<ReadWatchItem>>(JsonOptions);
        Assert.NotNull(items);
        Assert.DoesNotContain(items, i => i.Title == "other-week-consumed-test");
    }

    [Fact]
    public async Task PutReadWatch_SetsIsActiveFalse_BacklogsItem()
    {
        // Arrange
        var createResp = await _client.PostAsJsonAsync("/api/read-watch", new
        {
            Text = "backlog-toggle-test",
            Type = "Read",
            Date = "2019-06-01"
        });
        var created = await createResp.Content.ReadFromJsonAsync<ReadWatchItem>(JsonOptions);

        // Act
        var response = await _client.PutAsJsonAsync($"/api/read-watch/{created!.Id}", new { IsActive = false });

        // Assert
        response.EnsureSuccessStatusCode();
        var updated = await response.Content.ReadFromJsonAsync<ReadWatchItem>(JsonOptions);
        Assert.NotNull(updated);
        Assert.False(updated.IsActive);
    }

    [Fact]
    public async Task PutReadWatch_SetsIsActiveTrue_RestoresFromBacklog()
    {
        // Arrange
        var createResp = await _client.PostAsJsonAsync("/api/read-watch", new
        {
            Text = "restore-toggle-test",
            Type = "Read",
            Date = "2019-07-01"
        });
        var created = await createResp.Content.ReadFromJsonAsync<ReadWatchItem>(JsonOptions);
        await _client.PutAsJsonAsync($"/api/read-watch/{created!.Id}", new { IsActive = false });

        // Act
        var response = await _client.PutAsJsonAsync($"/api/read-watch/{created.Id}", new { IsActive = true });

        // Assert
        response.EnsureSuccessStatusCode();
        var updated = await response.Content.ReadFromJsonAsync<ReadWatchItem>(JsonOptions);
        Assert.NotNull(updated);
        Assert.True(updated.IsActive);
    }

    [Fact]
    public async Task PutConsumeReadWatch_SetsAllFields()
    {
        var testWeekOf = "2019-08-05";

        // Arrange
        var createResp = await _client.PostAsJsonAsync("/api/read-watch", new
        {
            Text = "consume-fields-test",
            Type = "Read",
            Date = "2019-08-07"
        });
        var created = await createResp.Content.ReadFromJsonAsync<ReadWatchItem>(JsonOptions);

        // Act
        var response = await _client.PutAsJsonAsync($"/api/read-watch/{created!.Id}/consume", new
        {
            WorthSharing = true,
            Notes = "Very insightful article",
            WeekOf = testWeekOf
        });

        // Assert
        response.EnsureSuccessStatusCode();
        var consumed = await response.Content.ReadFromJsonAsync<ReadWatchItem>(JsonOptions);
        Assert.NotNull(consumed);
        Assert.True(consumed.IsDone);
        Assert.False(consumed.IsActive);
        Assert.True(consumed.WorthSharing);
        Assert.Equal("Very insightful article", consumed.Notes);
        Assert.Equal(testWeekOf, consumed.WeekConsumed?.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture));
    }

    [Fact]
    public async Task PutConsumeReadWatch_ReturnsNotFound_WhenMissing()
    {
        var response = await _client.PutAsJsonAsync("/api/read-watch/99999/consume", new
        {
            WorthSharing = false,
            Notes = "N/A",
            WeekOf = "2019-09-02"
        });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task PostReadWatch_EnforcesLimit_IgnoringBacklogItems()
    {
        var testDate = "2019-11-01";

        // Arrange — create 5 items
        var createdIds = new List<int>();
        for (var i = 0; i < 5; i++)
        {
            var resp = await _client.PostAsJsonAsync("/api/read-watch", new
            {
                Text = $"limit-test-item-{i}",
                Type = "Read",
                Date = testDate
            });
            Assert.Equal(HttpStatusCode.Created, resp.StatusCode);
            var item = await resp.Content.ReadFromJsonAsync<ReadWatchItem>(JsonOptions);
            createdIds.Add(item!.Id);
        }

        // Backlog one of them — active count drops to 4
        await _client.PutAsJsonAsync($"/api/read-watch/{createdIds[0]}", new { IsActive = false });

        // Act — add a 6th item; active count is 4 so it should succeed
        var sixthResp = await _client.PostAsJsonAsync("/api/read-watch", new
        {
            Text = "limit-test-sixth-item",
            Type = "Read",
            Date = testDate
        });

        // Assert
        Assert.Equal(HttpStatusCode.Created, sixthResp.StatusCode);
    }

    [Fact]
    public async Task PutConsumeReadWatch_PreservesWeekConsumed_WhenReconsumed()
    {
        var originalWeekOf = "2019-10-07";
        var newWeekOf = "2019-10-14";

        // Arrange — create and consume an item in week A
        var createResp = await _client.PostAsJsonAsync("/api/read-watch", new
        {
            Text = "preserve-week-consumed-test",
            Type = "Read",
            Date = "2019-10-09"
        });
        var created = await createResp.Content.ReadFromJsonAsync<ReadWatchItem>(JsonOptions);

        await _client.PutAsJsonAsync($"/api/read-watch/{created!.Id}/consume", new
        {
            WorthSharing = true,
            Notes = "Original notes",
            WeekOf = originalWeekOf
        });

        // Act — consume again with a different week (simulating a review save)
        var reviewResp = await _client.PutAsJsonAsync($"/api/read-watch/{created.Id}/consume", new
        {
            WorthSharing = false,
            Notes = "Updated notes",
            WeekOf = newWeekOf
        });

        // Assert — WeekConsumed must still reflect the original week
        reviewResp.EnsureSuccessStatusCode();
        var reviewed = await reviewResp.Content.ReadFromJsonAsync<ReadWatchItem>(JsonOptions);
        Assert.NotNull(reviewed);
        Assert.Equal(originalWeekOf, reviewed.WeekConsumed?.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture));
        Assert.Equal("Updated notes", reviewed.Notes);
        Assert.False(reviewed.WorthSharing);
    }
}
