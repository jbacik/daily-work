using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using DailyWork.Api.Entities;
using DailyWork.Api.Enums;
using DailyWork.Api.Tests.Fixtures;
using Shouldly;
using Xunit;

namespace DailyWork.Api.Tests;

public class WorkMetricEndpointTests : IClassFixture<CustomWebApplicationFactory>, IAsyncLifetime
{
	private readonly CustomWebApplicationFactory _factory;
	private readonly HttpClient _client;
	private static readonly JsonSerializerOptions JsonOptions = new()
	{
		PropertyNameCaseInsensitive = true,
		Converters = { new JsonStringEnumConverter() }
	};

	// Fake clock is 2020-01-15 (Wednesday); Monday of that week is 2020-01-13
	private const string CurrentWeekOf = "2020-01-13";
	private const string PastWeekOf = "2020-01-06";

	public WorkMetricEndpointTests(CustomWebApplicationFactory factory)
	{
		_factory = factory;
		_client = factory.CreateClient();
	}

	public Task InitializeAsync() => _factory.ResetDatabaseAsync();
	public Task DisposeAsync() => Task.CompletedTask;

	private async Task<WorkMetricDefinition> CreateDefinitionAsync(string title)
	{
		var response = await _client.PostAsJsonAsync("/api/work-metrics/definitions", new { title });
		response.EnsureSuccessStatusCode();
		var definition = await response.Content.ReadFromJsonAsync<WorkMetricDefinition>(JsonOptions);
		definition.ShouldNotBeNull();
		return definition;
	}

	private async Task<List<WorkMetricEntry>> GetEntriesAsync(string weekOf)
	{
		var response = await _client.GetAsync($"/api/work-metrics/entries?weekOf={weekOf}");
		response.EnsureSuccessStatusCode();
		var entries = await response.Content.ReadFromJsonAsync<List<WorkMetricEntry>>(JsonOptions);
		entries.ShouldNotBeNull();
		return entries;
	}

	// ---- agent upsert contract -------------------------------------------

	[Fact]
	public async Task PutWorkMetricEntryByKey_CreatesEntry_WhenMissing()
	{
		// Arrange
		var payload = new { weekOf = CurrentWeekOf, title = "Bugs completed this week", value = "3 — VP-1170" };

		// Act
		var response = await _client.PutAsJsonAsync("/api/work-metrics/entries", payload);

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var entry = await response.Content.ReadFromJsonAsync<WorkMetricEntry>(JsonOptions);
		entry.ShouldNotBeNull();
		entry.WeekOf.ShouldBe(CurrentWeekOf);
		entry.Title.ShouldBe("Bugs completed this week");
		entry.Value.ShouldBe("3 — VP-1170");
		entry.Source.ShouldBe(WorkMetricSource.Agent);
		entry.DefinitionId.ShouldBeNull();
		entry.UpdatedAt.ShouldNotBeNull();
	}

	[Fact]
	public async Task PutWorkMetricEntryByKey_UpdatesValueIdempotently_WhenCalledTwice()
	{
		// Arrange
		var first = new { weekOf = PastWeekOf, title = "PRs involved in this week", value = "4 — VP-1133" };
		var second = new { weekOf = PastWeekOf, title = "PRs involved in this week", value = "6 — VP-1133, VP-1139" };

		// Act
		await _client.PutAsJsonAsync("/api/work-metrics/entries", first);
		var response = await _client.PutAsJsonAsync("/api/work-metrics/entries", second);

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var entries = await GetEntriesAsync(PastWeekOf);
		entries.ShouldHaveSingleItem();
		entries[0].Value.ShouldBe("6 — VP-1133, VP-1139");
	}

	[Fact]
	public async Task PutWorkMetricEntryByKey_LinksDefinition_WhenTitleMatchesDefinition()
	{
		// Arrange
		var definition = await CreateDefinitionAsync("AI win / experiment");

		// Act
		var response = await _client.PutAsJsonAsync("/api/work-metrics/entries",
			new { weekOf = PastWeekOf, title = "AI win / experiment", value = "Backfilled fixtures with an agent." });

		// Assert
		response.EnsureSuccessStatusCode();
		var entry = await response.Content.ReadFromJsonAsync<WorkMetricEntry>(JsonOptions);
		entry.ShouldNotBeNull();
		entry.DefinitionId.ShouldBe(definition.Id);
	}

	[Fact]
	public async Task PutWorkMetricEntryByKey_ReturnsBadRequest_WhenWeekOfNotMonday()
	{
		// Arrange
		var payload = new { weekOf = "2020-01-14", title = "Bugs completed this week", value = "nope" };

		// Act
		var response = await _client.PutAsJsonAsync("/api/work-metrics/entries", payload);

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
		var entries = await GetEntriesAsync(CurrentWeekOf);
		entries.ShouldBeEmpty();
	}

	[Fact]
	public async Task PutWorkMetricEntryByKey_ReturnsBadRequest_WhenTitleBlank()
	{
		var response = await _client.PutAsJsonAsync("/api/work-metrics/entries",
			new { weekOf = CurrentWeekOf, title = "   ", value = "orphan" });

		response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
	}

	// ---- entry reads + seeding -------------------------------------------

	[Fact]
	public async Task GetWorkMetricEntries_ReturnsBadRequest_WhenWeekOfMissing()
	{
		var response = await _client.GetAsync("/api/work-metrics/entries");

		response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
	}

	[Fact]
	public async Task GetWorkMetricEntries_ReturnsBadRequest_WhenWeekOfNotMonday()
	{
		var response = await _client.GetAsync("/api/work-metrics/entries?weekOf=2020-01-15");

		response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
	}

	[Fact]
	public async Task GetWorkMetricEntries_SeedsActiveDefinitions_WhenCurrentWeek()
	{
		// Arrange
		await CreateDefinitionAsync("Bugs completed this week");
		await CreateDefinitionAsync("PRs involved in this week");

		// Act
		var entries = await GetEntriesAsync(CurrentWeekOf);

		// Assert
		entries.Count.ShouldBe(2);
		entries.Select(e => e.Title).ShouldBe(["Bugs completed this week", "PRs involved in this week"]);
		entries.ShouldAllBe(e => e.Value == null);
		entries.ShouldAllBe(e => e.DefinitionId != null);
		entries.ShouldAllBe(e => e.Source == WorkMetricSource.App);
	}

	[Fact]
	public async Task GetWorkMetricEntries_DoesNotDuplicateSeeds_WhenCalledTwice()
	{
		// Arrange
		await CreateDefinitionAsync("Bugs completed this week");
		await GetEntriesAsync(CurrentWeekOf);

		// Act
		var entries = await GetEntriesAsync(CurrentWeekOf);

		// Assert
		entries.ShouldHaveSingleItem();
	}

	[Fact]
	public async Task GetWorkMetricEntries_DoesNotSeed_WhenPastWeek()
	{
		// Arrange
		await CreateDefinitionAsync("Bugs completed this week");

		// Act
		var entries = await GetEntriesAsync(PastWeekOf);

		// Assert
		entries.ShouldBeEmpty();
	}

	[Fact]
	public async Task GetWorkMetricEntries_SkipsInactiveDefinitions_WhenSeeding()
	{
		// Arrange
		var retired = await CreateDefinitionAsync("Standup themes");
		await CreateDefinitionAsync("Bugs completed this week");
		var retire = await _client.PutAsJsonAsync($"/api/work-metrics/definitions/{retired.Id}", new { isActive = false });
		retire.EnsureSuccessStatusCode();

		// Act
		var entries = await GetEntriesAsync(CurrentWeekOf);

		// Assert
		entries.ShouldHaveSingleItem();
		entries[0].Title.ShouldBe("Bugs completed this week");
	}

	[Fact]
	public async Task GetWorkMetricEntries_DoesNotReseedAgentWrittenTitle_WhenDefinitionMatches()
	{
		// Arrange
		await CreateDefinitionAsync("Bugs completed this week");
		await _client.PutAsJsonAsync("/api/work-metrics/entries",
			new { weekOf = CurrentWeekOf, title = "Bugs completed this week", value = "5 — VP-1188" });

		// Act
		var entries = await GetEntriesAsync(CurrentWeekOf);

		// Assert
		entries.ShouldHaveSingleItem();
		entries[0].Value.ShouldBe("5 — VP-1188");
		entries[0].Source.ShouldBe(WorkMetricSource.Agent);
	}

	// ---- definitions ------------------------------------------------------

	[Fact]
	public async Task GetWorkMetricDefinitions_ReturnsActiveOnly_WhenRetiredExist()
	{
		// Arrange
		var retired = await CreateDefinitionAsync("Standup themes");
		await CreateDefinitionAsync("Bugs completed this week");
		await _client.PutAsJsonAsync($"/api/work-metrics/definitions/{retired.Id}", new { isActive = false });

		// Act
		var response = await _client.GetAsync("/api/work-metrics/definitions");

		// Assert
		response.EnsureSuccessStatusCode();
		var definitions = await response.Content.ReadFromJsonAsync<List<WorkMetricDefinition>>(JsonOptions);
		definitions.ShouldNotBeNull();
		definitions.ShouldHaveSingleItem();
		definitions[0].Title.ShouldBe("Bugs completed this week");
	}

	[Fact]
	public async Task GetAllWorkMetricDefinitions_ReturnsRetiredToo_WhenRetiredExist()
	{
		// Arrange
		var retired = await CreateDefinitionAsync("Standup themes");
		await CreateDefinitionAsync("Bugs completed this week");
		await _client.PutAsJsonAsync($"/api/work-metrics/definitions/{retired.Id}", new { isActive = false });

		// Act
		var response = await _client.GetAsync("/api/work-metrics/definitions/all");

		// Assert
		response.EnsureSuccessStatusCode();
		var definitions = await response.Content.ReadFromJsonAsync<List<WorkMetricDefinition>>(JsonOptions);
		definitions.ShouldNotBeNull();
		definitions.Count.ShouldBe(2);
		definitions.ShouldContain(d => !d.IsActive && d.Title == "Standup themes");
	}

	[Fact]
	public async Task PostWorkMetricDefinition_Returns422_WhenDuplicateTitle()
	{
		// Arrange
		await CreateDefinitionAsync("Bugs completed this week");

		// Act
		var response = await _client.PostAsJsonAsync("/api/work-metrics/definitions",
			new { title = "Bugs completed this week" });

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
	}

	[Fact]
	public async Task PostWorkMetricDefinition_ReturnsBadRequest_WhenTitleBlank()
	{
		var response = await _client.PostAsJsonAsync("/api/work-metrics/definitions", new { title = "  " });

		response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
	}

	[Fact]
	public async Task PutWorkMetricDefinition_DoesNotRenameExistingEntries_WhenTitleChanged()
	{
		// Arrange
		var definition = await CreateDefinitionAsync("Bugs completed this week");
		await GetEntriesAsync(CurrentWeekOf);

		// Act
		var response = await _client.PutAsJsonAsync($"/api/work-metrics/definitions/{definition.Id}",
			new { title = "Bugs closed this week" });

		// Assert
		response.EnsureSuccessStatusCode();
		var entries = await GetEntriesAsync(CurrentWeekOf);
		entries.ShouldContain(e => e.Title == "Bugs completed this week");
	}

	[Fact]
	public async Task PutWorkMetricDefinition_Returns422_WhenRenamedToExistingTitle()
	{
		// Arrange
		await CreateDefinitionAsync("Bugs completed this week");
		var second = await CreateDefinitionAsync("PRs involved in this week");

		// Act
		var response = await _client.PutAsJsonAsync($"/api/work-metrics/definitions/{second.Id}",
			new { title = "Bugs completed this week" });

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
	}

	[Fact]
	public async Task PutWorkMetricDefinition_ReturnsNotFound_WhenDefinitionMissing()
	{
		var response = await _client.PutAsJsonAsync("/api/work-metrics/definitions/9999", new { title = "Nope" });

		response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
	}

	[Fact]
	public async Task DeleteWorkMetricDefinition_PreservesEntries_WhenEntriesExist()
	{
		// Arrange
		var definition = await CreateDefinitionAsync("Bugs completed this week");
		await _client.PutAsJsonAsync("/api/work-metrics/entries",
			new { weekOf = CurrentWeekOf, title = "Bugs completed this week", value = "5 — VP-1188" });

		// Act
		var response = await _client.DeleteAsync($"/api/work-metrics/definitions/{definition.Id}");

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.NoContent);
		var entries = await GetEntriesAsync(CurrentWeekOf);
		entries.ShouldHaveSingleItem();
		entries[0].Value.ShouldBe("5 — VP-1188");
		entries[0].DefinitionId.ShouldBeNull();
	}

	// ---- in-app entry writes ----------------------------------------------

	[Fact]
	public async Task PostWorkMetricEntry_CreatesAdHocEntry_ReturnsCreated()
	{
		// Arrange
		var payload = new { weekOf = CurrentWeekOf, title = "Pairing experiment", value = (string?)null };

		// Act
		var response = await _client.PostAsJsonAsync("/api/work-metrics/entries", payload);

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.Created);
		var entry = await response.Content.ReadFromJsonAsync<WorkMetricEntry>(JsonOptions);
		entry.ShouldNotBeNull();
		entry.DefinitionId.ShouldBeNull();
		entry.Source.ShouldBe(WorkMetricSource.App);
		entry.Value.ShouldBeNull();
	}

	[Fact]
	public async Task PostWorkMetricEntry_Returns422_WhenDuplicateTitleInWeek()
	{
		// Arrange
		await _client.PostAsJsonAsync("/api/work-metrics/entries",
			new { weekOf = CurrentWeekOf, title = "Pairing experiment" });

		// Act
		var response = await _client.PostAsJsonAsync("/api/work-metrics/entries",
			new { weekOf = CurrentWeekOf, title = "Pairing experiment" });

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
	}

	[Fact]
	public async Task PutWorkMetricEntry_FlipsSourceToApp_WhenAgentValueEditedByHand()
	{
		// Arrange
		var upsert = await _client.PutAsJsonAsync("/api/work-metrics/entries",
			new { weekOf = CurrentWeekOf, title = "Bugs completed this week", value = "5 — VP-1188" });
		var seeded = await upsert.Content.ReadFromJsonAsync<WorkMetricEntry>(JsonOptions);
		seeded.ShouldNotBeNull();

		// Act
		var response = await _client.PutAsJsonAsync($"/api/work-metrics/entries/{seeded.Id}",
			new { value = "5 — hand-corrected" });

		// Assert
		response.EnsureSuccessStatusCode();
		var entry = await response.Content.ReadFromJsonAsync<WorkMetricEntry>(JsonOptions);
		entry.ShouldNotBeNull();
		entry.Value.ShouldBe("5 — hand-corrected");
		entry.Source.ShouldBe(WorkMetricSource.App);
	}

	[Fact]
	public async Task PutWorkMetricEntry_ClearsValueToPending_WhenValueIsEmpty()
	{
		// Arrange
		var created = await _client.PostAsJsonAsync("/api/work-metrics/entries",
			new { weekOf = CurrentWeekOf, title = "Pairing experiment", value = "something" });
		var entry = await created.Content.ReadFromJsonAsync<WorkMetricEntry>(JsonOptions);
		entry.ShouldNotBeNull();

		// Act
		var response = await _client.PutAsJsonAsync($"/api/work-metrics/entries/{entry.Id}", new { value = "" });

		// Assert
		response.EnsureSuccessStatusCode();
		var updated = await response.Content.ReadFromJsonAsync<WorkMetricEntry>(JsonOptions);
		updated.ShouldNotBeNull();
		updated.Value.ShouldBeNull();
	}

	[Fact]
	public async Task PutWorkMetricEntry_ReturnsNotFound_WhenEntryMissing()
	{
		var response = await _client.PutAsJsonAsync("/api/work-metrics/entries/9999", new { value = "x" });

		response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
	}

	[Fact]
	public async Task DeleteWorkMetricEntry_RemovesEntry_ReturnsNoContent()
	{
		// Arrange
		var created = await _client.PostAsJsonAsync("/api/work-metrics/entries",
			new { weekOf = PastWeekOf, title = "Pairing experiment" });
		var entry = await created.Content.ReadFromJsonAsync<WorkMetricEntry>(JsonOptions);
		entry.ShouldNotBeNull();

		// Act
		var response = await _client.DeleteAsync($"/api/work-metrics/entries/{entry.Id}");

		// Assert
		response.StatusCode.ShouldBe(HttpStatusCode.NoContent);
		var entries = await GetEntriesAsync(PastWeekOf);
		entries.ShouldBeEmpty();
	}

	[Fact]
	public async Task DeleteWorkMetricEntry_ReturnsNotFound_WhenEntryMissing()
	{
		var response = await _client.DeleteAsync("/api/work-metrics/entries/9999");

		response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
	}

	// ---- historical listing -----------------------------------------------

	[Fact]
	public async Task GetWorkMetricWeeks_ReturnsSummariesDescending_WhenMultipleWeeks()
	{
		// Arrange
		await _client.PutAsJsonAsync("/api/work-metrics/entries",
			new { weekOf = PastWeekOf, title = "Bugs completed this week", value = "2 — VP-1141" });
		await _client.PutAsJsonAsync("/api/work-metrics/entries",
			new { weekOf = CurrentWeekOf, title = "Bugs completed this week", value = "5 — VP-1188" });
		await _client.PostAsJsonAsync("/api/work-metrics/entries",
			new { weekOf = CurrentWeekOf, title = "Pairing experiment", value = (string?)null });

		// Act
		var response = await _client.GetAsync("/api/work-metrics/weeks");

		// Assert
		response.EnsureSuccessStatusCode();
		var weeks = await response.Content.ReadFromJsonAsync<List<WorkMetricWeekSummary>>(JsonOptions);
		weeks.ShouldNotBeNull();
		weeks.Count.ShouldBe(2);
		weeks[0].WeekOf.ShouldBe(CurrentWeekOf);
		weeks[0].EntryCount.ShouldBe(2);
		weeks[0].FilledCount.ShouldBe(1);
		weeks[1].WeekOf.ShouldBe(PastWeekOf);
		weeks[1].FilledCount.ShouldBe(1);
	}

	private sealed record WorkMetricWeekSummary(string WeekOf, int EntryCount, int FilledCount);
}
