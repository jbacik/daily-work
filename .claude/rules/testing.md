---
apply: "api/tests/**"
---

# Testing Conventions

## Test Class Setup

Every integration/endpoint test class implements `IClassFixture<CustomWebApplicationFactory>` and `IAsyncLifetime`, stores the factory for the Respawn reset hook, and receives an `HttpClient` via constructor. Define shared JSON options as a static field:

```csharp
public class WorkItemEndpointTests : IClassFixture<CustomWebApplicationFactory>, IAsyncLifetime
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public WorkItemEndpointTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    public Task InitializeAsync() => _factory.ResetDatabaseAsync();
    public Task DisposeAsync() => Task.CompletedTask;
}
```

When creating new test files for other endpoints, mirror `WorkItemEndpointTests.cs` exactly.

## Test Naming

`[Fact]` methods follow `Route_Description_WhenCondition`:

```
GetWorkItems_ReturnsEmptyList_WhenNoItems
PostWorkItem_CreatesItem_ReturnsCreated
PutWorkItem_ReturnsNotFound_WhenItemMissing
```

No `Should_` prefix. No extra underscores beyond the three-part pattern.

## AAA Structure

Separate Arrange / Act / Assert with blank lines:

```csharp
[Fact]
public async Task PostWorkItem_CreatesItem_ReturnsCreated()
{
    // Arrange
    var payload = new { Title = "Test item", Category = "SmallThing" };

    // Act
    var response = await _client.PostAsJsonAsync("/api/work-items", payload);

    // Assert
    Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    var item = await response.Content.ReadFromJsonAsync<WorkItem>(JsonOptions);
    Assert.NotNull(item);
    Assert.Equal("Test item", item.Title);
}
```

## Reading Responses

- Success paths: `response.EnsureSuccessStatusCode()`
- Always pass `JsonOptions` to `ReadFromJsonAsync<T>`
- Error paths: `Assert.Equal(HttpStatusCode.XxxCode, response.StatusCode)`

## NSubstitute

NSubstitute is available but integration tests go through the real HTTP stack against a Postgres Testcontainer — do not mock the database or EF Core. Only use NSubstitute for mocking something outside the HTTP pipeline (e.g., an external service). Do not use Moq (not in the project).

## `CustomWebApplicationFactory`

Do not modify `CustomWebApplicationFactory` for individual tests. Seed data by POSTing through the HTTP client in the test's Arrange section — do not reach into the database directly.

## Test Isolation

Every test class that hits the database implements `IAsyncLifetime` and calls `_factory.ResetDatabaseAsync()` in `InitializeAsync`. The factory uses [Respawn](https://github.com/jbogard/Respawn) to truncate all tables (except `__EFMigrationsHistory`) before each test, so every test starts with an empty database.

That means `Assert.Single`, `Assert.Equal(3, items.Count)`, and other count-based assertions are safe — you own the data you create in Arrange, and nothing else exists. Filtering assertions by a unique title is no longer required (though still fine when it reads more clearly).

```csharp
public class MyEndpointTests : IClassFixture<CustomWebApplicationFactory>, IAsyncLifetime
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public MyEndpointTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    public Task InitializeAsync() => _factory.ResetDatabaseAsync();
    public Task DisposeAsync() => Task.CompletedTask;
}
```
