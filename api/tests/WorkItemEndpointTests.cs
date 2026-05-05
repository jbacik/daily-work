using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using DailyWork.Api.Entities;
using DailyWork.Api.Tests.Fixtures;
using Shouldly;
using Xunit;

namespace DailyWork.Api.Tests;

public class WorkItemEndpointTests : IClassFixture<CustomWebApplicationFactory>, IAsyncLifetime
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

	public Task InitializeAsync() => _factory.ResetDatabaseAsync();
	public Task DisposeAsync() => Task.CompletedTask;

	[Fact]
	public async Task GetWorkItems_ReturnsEmptyList_WhenNoItemsForWeek()
	{
		var response = await _client.GetAsync($"/api/work-items?weekOf=1990-01-01");

		response.EnsureSuccessStatusCode();
		var items = await response.Content.ReadFromJsonAsync<List<WorkItem>>(JsonOptions);
		items.ShouldNotBeNull();
		items.ShouldBeEmpty();
	}

	[Fact]
	public async Task GetWorkItems_Returns400_WhenWeekOfMissing()
	{
		var response = await _client.GetAsync("/api/work-items");

		response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
	}

	[Fact]
	public async Task PostWorkItem_CreatesItem_ReturnsCreated()
	{
		var payload = new { Title = "Test item", Category = "SmallThing" };

		var response = await _client.PostAsJsonAsync("/api/work-items", payload);

		response.StatusCode.ShouldBe(HttpStatusCode.Created);
		var item = await response.Content.ReadFromJsonAsync<WorkItem>(JsonOptions);
		item.ShouldNotBeNull();
		item.Title.ShouldBe("Test item");
	}

	[Fact]
	public async Task PostWorkItem_SetsWeekOf_Automatically()
	{
		var date = _factory.DateTimeProvider.UtcToday.ToString("O", System.Globalization.CultureInfo.InvariantCulture);
		var payload = new { Title = "WeekOf test item", Category = "SmallThing", Date = date };

		var response = await _client.PostAsJsonAsync("/api/work-items", payload);

		response.StatusCode.ShouldBe(HttpStatusCode.Created);
		var item = await response.Content.ReadFromJsonAsync<WorkItem>(JsonOptions);
		item.ShouldNotBeNull();
		item.WeekOf.ShouldBe(TestWeekOf);
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
		items.ShouldNotBeNull();
		items.ShouldContain(i => i.Title == "Week filter test item");
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

		response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
	}

	[Fact]
	public async Task PostWorkItem_AssignsIncrementingSortOrder_WhenSameDay()
	{
		var date = new DateOnly(2020, 1, 17).ToString("O", System.Globalization.CultureInfo.InvariantCulture);

		var r1 = await _client.PostAsJsonAsync("/api/work-items", new { Title = "SortOrder A", Category = "SmallThing", Date = date });
		var r2 = await _client.PostAsJsonAsync("/api/work-items", new { Title = "SortOrder B", Category = "SmallThing", Date = date });
		var r3 = await _client.PostAsJsonAsync("/api/work-items", new { Title = "SortOrder C", Category = "SmallThing", Date = date });

		var item1 = await r1.Content.ReadFromJsonAsync<WorkItem>(JsonOptions);
		var item2 = await r2.Content.ReadFromJsonAsync<WorkItem>(JsonOptions);
		var item3 = await r3.Content.ReadFromJsonAsync<WorkItem>(JsonOptions);

		item1.ShouldNotBeNull();
		item2.ShouldNotBeNull();
		item3.ShouldNotBeNull();
		new[] { item1.SortOrder, item2.SortOrder, item3.SortOrder }.ShouldBeInOrder();
	}

	[Fact]
	public async Task GetWorkItems_ReturnsItemsSortedBySortOrder_WhenMultipleSameDay()
	{
		var date = new DateOnly(2020, 1, 17).ToString("O", System.Globalization.CultureInfo.InvariantCulture);

		await _client.PostAsJsonAsync("/api/work-items", new { Title = "Sorted first marker", Category = "SmallThing", Date = date });
		await _client.PostAsJsonAsync("/api/work-items", new { Title = "Sorted second marker", Category = "SmallThing", Date = date });

		var getResponse = await _client.GetAsync($"/api/work-items?weekOf={TestWeekOf}");
		var items = await getResponse.Content.ReadFromJsonAsync<List<WorkItem>>(JsonOptions);
		items.ShouldNotBeNull();

		var filtered = items.Where(i => i.Title == "Sorted first marker" || i.Title == "Sorted second marker").ToList();
		filtered.Count.ShouldBe(2);
		filtered.Select(i => i.SortOrder).ShouldBeInOrder();
		filtered[0].Title.ShouldBe("Sorted first marker");
	}

	[Fact]
	public async Task MoveUpWorkItem_SwapsWithPrevious_WhenNotFirst()
	{
		var date = new DateOnly(2020, 1, 18).ToString("O", System.Globalization.CultureInfo.InvariantCulture);

		var r1 = await _client.PostAsJsonAsync("/api/work-items", new { Title = "MoveUp alpha marker", Category = "SmallThing", Date = date });
		var r2 = await _client.PostAsJsonAsync("/api/work-items", new { Title = "MoveUp beta marker", Category = "SmallThing", Date = date });
		var item1 = await r1.Content.ReadFromJsonAsync<WorkItem>(JsonOptions);
		var item2 = await r2.Content.ReadFromJsonAsync<WorkItem>(JsonOptions);
		item1.ShouldNotBeNull();
		item2.ShouldNotBeNull();
		var expectedSortedIds = new[] { item2.Id, item1.Id };

		var moveResponse = await _client.PutAsync($"/api/work-items/{item2.Id}/move-up", null);
		moveResponse.EnsureSuccessStatusCode();

		var getResponse = await _client.GetAsync($"/api/work-items?weekOf={TestWeekOf}");
		var items = await getResponse.Content.ReadFromJsonAsync<List<WorkItem>>(JsonOptions);
		items.ShouldNotBeNull();
		var actualSortedIds = items.Where(i => i.Id == item1.Id || i.Id == item2.Id).Select(i => i.Id).ToArray();
		actualSortedIds.ShouldBe(expectedSortedIds);
	}

	[Fact]
	public async Task MoveUpWorkItem_NoOp_WhenAlreadyFirst()
	{
		var date = new DateOnly(2020, 1, 20).ToString("O", System.Globalization.CultureInfo.InvariantCulture);

		var r1 = await _client.PostAsJsonAsync("/api/work-items", new { Title = "MoveUpFirst solo marker", Category = "SmallThing", Date = date });
		var item1 = await r1.Content.ReadFromJsonAsync<WorkItem>(JsonOptions);
		item1.ShouldNotBeNull();
		var originalSortOrder = item1.SortOrder;

		var moveResponse = await _client.PutAsync($"/api/work-items/{item1.Id}/move-up", null);
		moveResponse.EnsureSuccessStatusCode();
		var moved = await moveResponse.Content.ReadFromJsonAsync<WorkItem>(JsonOptions);

		moved.ShouldNotBeNull();
		moved.SortOrder.ShouldBe(originalSortOrder);
	}

	[Fact]
	public async Task MoveDownWorkItem_SwapsWithNext_WhenNotLast()
	{
		var date = new DateOnly(2020, 1, 19).ToString("O", System.Globalization.CultureInfo.InvariantCulture);

		var r1 = await _client.PostAsJsonAsync("/api/work-items", new { Title = "MoveDown alpha marker", Category = "SmallThing", Date = date });
		var r2 = await _client.PostAsJsonAsync("/api/work-items", new { Title = "MoveDown beta marker", Category = "SmallThing", Date = date });
		var item1 = await r1.Content.ReadFromJsonAsync<WorkItem>(JsonOptions);
		var item2 = await r2.Content.ReadFromJsonAsync<WorkItem>(JsonOptions);
		item1.ShouldNotBeNull();
		item2.ShouldNotBeNull();
		var expectedSortedIds = new[] { item2.Id, item1.Id };

		var moveResponse = await _client.PutAsync($"/api/work-items/{item1.Id}/move-down", null);
		moveResponse.EnsureSuccessStatusCode();

		var getResponse = await _client.GetAsync($"/api/work-items?weekOf={TestWeekOf}");
		var items = await getResponse.Content.ReadFromJsonAsync<List<WorkItem>>(JsonOptions);
		items.ShouldNotBeNull();
		var actualSortedIds = items.Where(i => i.Id == item1.Id || i.Id == item2.Id).Select(i => i.Id).ToArray();
		actualSortedIds.ShouldBe(expectedSortedIds);
	}

	[Fact]
	public async Task MoveDownWorkItem_NoOp_WhenAlreadyLast()
	{
		var date = new DateOnly(2020, 1, 22).ToString("O", System.Globalization.CultureInfo.InvariantCulture);

		var r1 = await _client.PostAsJsonAsync("/api/work-items", new { Title = "MoveDownLast solo marker", Category = "SmallThing", Date = date });
		var item1 = await r1.Content.ReadFromJsonAsync<WorkItem>(JsonOptions);
		item1.ShouldNotBeNull();
		var originalSortOrder = item1.SortOrder;

		var moveResponse = await _client.PutAsync($"/api/work-items/{item1.Id}/move-down", null);
		moveResponse.EnsureSuccessStatusCode();
		var moved = await moveResponse.Content.ReadFromJsonAsync<WorkItem>(JsonOptions);

		moved.ShouldNotBeNull();
		moved.SortOrder.ShouldBe(originalSortOrder);
	}
}
