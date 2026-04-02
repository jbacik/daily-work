---
apply: "api/tests/**"
---

# Testing Conventions

## Test Class Setup

Every test class implements `IClassFixture<CustomWebApplicationFactory>` and receives an `HttpClient` via constructor. Define shared JSON options as a static field:

```csharp
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

NSubstitute is available but integration tests go through the real HTTP stack with in-memory SQLite — do not mock the database or EF Core. Only use NSubstitute for mocking something outside the HTTP pipeline (e.g., an external service). Do not use Moq (not in the project).

## `CustomWebApplicationFactory`

Do not modify `CustomWebApplicationFactory` for individual tests. Seed data by POSTing through the HTTP client in the test's Arrange section — do not reach into the database directly.

## Test Isolation

`IClassFixture` shares one factory instance across all tests in a class (shared SQLite connection). Tests that check counts or list contents must filter by a unique value they created, not assume a clean database:

```csharp
// CORRECT — filters to a unique title this test owns
Assert.Contains(items, i => i.Title == "Integration test item");

// WRONG — assumes no other tests ran
Assert.Single(items);
```
