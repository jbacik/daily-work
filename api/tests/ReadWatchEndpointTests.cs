using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using DailyWork.Api.Entities;
using DailyWork.Api.Tests.Fixtures;
using Shouldly;
using Xunit;

namespace DailyWork.Api.Tests;

public class ReadWatchEndpointTests : IClassFixture<CustomWebApplicationFactory>, IAsyncLifetime
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public ReadWatchEndpointTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    public Task InitializeAsync() => _factory.ResetDatabaseAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task PostReadWatch_ParsesUrlFromText_ReturnsCreated()
    {
        var response = await _client.PostAsJsonAsync("/api/read-watch", new
        {
            Text = "Interesting article https://example.com/article",
            Type = "Read",
            Date = "2019-01-01"
        });

        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        var item = await response.Content.ReadFromJsonAsync<ReadWatchItem>(JsonOptions);
        item.ShouldNotBeNull();
        item.Title.ShouldBe("Interesting article");
        item.Url.ShouldBe("https://example.com/article");
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

        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        var item = await response.Content.ReadFromJsonAsync<ReadWatchItem>(JsonOptions);
        item.ShouldNotBeNull();
        item.Title.ShouldBe("Learn about design patterns");
        item.Url.ShouldBe(string.Empty);
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

        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        var item = await response.Content.ReadFromJsonAsync<ReadWatchItem>(JsonOptions);
        item.ShouldNotBeNull();
        item.Title.ShouldBe("https://example.com/video");
        item.Url.ShouldBe("https://example.com/video");
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

        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        var item = await response.Content.ReadFromJsonAsync<ReadWatchItem>(JsonOptions);
        item.ShouldNotBeNull();
        item.Type.ToString().ShouldBe("Learn");
    }

    [Fact]
    public async Task GetReadWatch_NoParams_ReturnsAllActiveNotDoneAcrossDates()
    {
        // Arrange — create active items on different dates
        await _client.PostAsJsonAsync("/api/read-watch", new
        {
            Text = "active-date-a-test",
            Type = "Read",
            Date = "2019-02-01"
        });
        await _client.PostAsJsonAsync("/api/read-watch", new
        {
            Text = "active-date-b-test",
            Type = "Read",
            Date = "2019-02-05"
        });

        var backlogResp = await _client.PostAsJsonAsync("/api/read-watch", new
        {
            Text = "backlog-cross-date-test",
            Type = "Read",
            Date = "2019-02-01"
        });
        var backlogItem = await backlogResp.Content.ReadFromJsonAsync<ReadWatchItem>(JsonOptions);
        await _client.PutAsJsonAsync($"/api/read-watch/{backlogItem!.Id}", new { IsActive = false });

        // Act
        var response = await _client.GetAsync("/api/read-watch");

        // Assert
        response.EnsureSuccessStatusCode();
        var items = await response.Content.ReadFromJsonAsync<List<ReadWatchItem>>(JsonOptions);
        items.ShouldNotBeNull();
        items.ShouldContain(i => i.Title == "active-date-a-test");
        items.ShouldContain(i => i.Title == "active-date-b-test");
        items.ShouldNotContain(i => i.Title == "backlog-cross-date-test");
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
        items.ShouldNotBeNull();
        items.ShouldContain(i => i.Title == "weekof-active-test");
        items.ShouldContain(i => i.Title == "weekof-consumed-test");
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
        items.ShouldNotBeNull();
        items.ShouldNotContain(i => i.Title == "other-week-consumed-test");
    }

    [Fact]
    public async Task PostReadWatch_WithIsActiveFalse_CreatesBacklogItem()
    {
        // Arrange — fill the global active limit
        for (var i = 0; i < 5; i++)
        {
            var r = await _client.PostAsJsonAsync("/api/read-watch", new
            {
                Text = $"backlog-limit-active-{i}",
                Type = "Read"
            });
            r.StatusCode.ShouldBe(HttpStatusCode.Created);
        }

        // Act — add a backlog item directly (should bypass the global limit)
        var response = await _client.PostAsJsonAsync("/api/read-watch", new
        {
            Text = "backlog-direct-create-test",
            Type = "Read",
            IsActive = false
        });

        // Assert
        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        var item = await response.Content.ReadFromJsonAsync<ReadWatchItem>(JsonOptions);
        item.ShouldNotBeNull();
        item.IsActive.ShouldBeFalse();
        item.Title.ShouldBe("backlog-direct-create-test");
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
        updated.ShouldNotBeNull();
        updated.IsActive.ShouldBeFalse();
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
        updated.ShouldNotBeNull();
        updated.IsActive.ShouldBeTrue();
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
        consumed.ShouldNotBeNull();
        consumed.IsDone.ShouldBeTrue();
        consumed.IsActive.ShouldBeFalse();
        consumed.WorthSharing.ShouldBe(true);
        consumed.Notes.ShouldBe("Very insightful article");
        consumed.WeekConsumed?.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture).ShouldBe(testWeekOf);
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

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PostReadWatch_EnforcesLimit_IgnoringBacklogItems()
    {
        // Arrange — create 5 active items
        var createdIds = new List<int>();
        for (var i = 0; i < 5; i++)
        {
            var resp = await _client.PostAsJsonAsync("/api/read-watch", new
            {
                Text = $"limit-test-item-{i}",
                Type = "Read"
            });
            resp.StatusCode.ShouldBe(HttpStatusCode.Created);
            var item = await resp.Content.ReadFromJsonAsync<ReadWatchItem>(JsonOptions);
            createdIds.Add(item!.Id);
        }

        // 6th active item should be rejected
        var rejectedResp = await _client.PostAsJsonAsync("/api/read-watch", new
        {
            Text = "limit-test-sixth-item",
            Type = "Read"
        });
        rejectedResp.StatusCode.ShouldBe(HttpStatusCode.BadRequest);

        // Backlog one — active count drops to 4, next add should succeed
        await _client.PutAsJsonAsync($"/api/read-watch/{createdIds[0]}", new { IsActive = false });

        var sixthResp = await _client.PostAsJsonAsync("/api/read-watch", new
        {
            Text = "limit-test-sixth-after-backlog",
            Type = "Read"
        });
        sixthResp.StatusCode.ShouldBe(HttpStatusCode.Created);
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
        reviewed.ShouldNotBeNull();
        reviewed.WeekConsumed?.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture).ShouldBe(originalWeekOf);
        reviewed.Notes.ShouldBe("Updated notes");
        reviewed.WorthSharing.ShouldBe(false);
    }
}
