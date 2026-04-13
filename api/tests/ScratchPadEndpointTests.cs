using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using DailyWork.Api.Tests.Fixtures;
using Xunit;

namespace DailyWork.Api.Tests;

public class ScratchPadEndpointTests : IClassFixture<CustomWebApplicationFactory>, IAsyncLifetime
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    private sealed record ScratchPadResponse(int? Id, string? Content, bool? IsActive);

    public ScratchPadEndpointTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    public Task InitializeAsync() => _factory.ResetDatabaseAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task GetScratchPad_ReturnsNullContent_WhenNoActiveRecord()
    {
        // Arrange
        await _client.PostAsJsonAsync("/api/scratchpad/clean", new { });

        // Act
        var response = await _client.GetAsync("/api/scratchpad");

        // Assert
        response.EnsureSuccessStatusCode();
        var data = await response.Content.ReadFromJsonAsync<ScratchPadResponse>(JsonOptions);
        Assert.NotNull(data);
        Assert.Null(data.Content);
    }

    [Fact]
    public async Task PutScratchPad_CreatesRecord_ReturnsOk()
    {
        // Arrange
        await _client.PostAsJsonAsync("/api/scratchpad/clean", new { });

        // Act
        var response = await _client.PutAsJsonAsync("/api/scratchpad", new { content = "hello" });

        // Assert
        response.EnsureSuccessStatusCode();
        var data = await response.Content.ReadFromJsonAsync<ScratchPadResponse>(JsonOptions);
        Assert.NotNull(data);
        Assert.Equal("hello", data.Content);
        Assert.True(data.IsActive);
    }

    [Fact]
    public async Task GetScratchPad_ReturnsActiveContent_AfterSave()
    {
        // Arrange
        await _client.PostAsJsonAsync("/api/scratchpad/clean", new { });
        await _client.PutAsJsonAsync("/api/scratchpad", new { content = "persistent note" });

        // Act
        var response = await _client.GetAsync("/api/scratchpad");

        // Assert
        response.EnsureSuccessStatusCode();
        var data = await response.Content.ReadFromJsonAsync<ScratchPadResponse>(JsonOptions);
        Assert.NotNull(data);
        Assert.Equal("persistent note", data.Content);
    }

    [Fact]
    public async Task PutScratchPad_UpdatesContent_WhenActiveRecordExists()
    {
        // Arrange
        await _client.PostAsJsonAsync("/api/scratchpad/clean", new { });
        await _client.PutAsJsonAsync("/api/scratchpad", new { content = "first" });

        // Act
        await _client.PutAsJsonAsync("/api/scratchpad", new { content = "second" });

        // Assert
        var response = await _client.GetAsync("/api/scratchpad");
        response.EnsureSuccessStatusCode();
        var data = await response.Content.ReadFromJsonAsync<ScratchPadResponse>(JsonOptions);
        Assert.NotNull(data);
        Assert.Equal("second", data.Content);
    }

    [Fact]
    public async Task PostScratchPadClean_ReturnsNoContent_WhenActiveExists()
    {
        // Arrange
        await _client.PostAsJsonAsync("/api/scratchpad/clean", new { });
        await _client.PutAsJsonAsync("/api/scratchpad", new { content = "some notes" });

        // Act
        var response = await _client.PostAsJsonAsync("/api/scratchpad/clean", new { });

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task GetScratchPad_ReturnsNullContent_AfterClean()
    {
        // Arrange
        await _client.PutAsJsonAsync("/api/scratchpad", new { content = "some notes" });
        await _client.PostAsJsonAsync("/api/scratchpad/clean", new { });

        // Act
        var response = await _client.GetAsync("/api/scratchpad");

        // Assert
        response.EnsureSuccessStatusCode();
        var data = await response.Content.ReadFromJsonAsync<ScratchPadResponse>(JsonOptions);
        Assert.NotNull(data);
        Assert.Null(data.Content);
    }

    [Fact]
    public async Task PostScratchPadClean_ReturnsNoContent_WhenNoActiveRecord()
    {
        // Arrange
        await _client.PostAsJsonAsync("/api/scratchpad/clean", new { });

        // Act
        var response = await _client.PostAsJsonAsync("/api/scratchpad/clean", new { });

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }
}
