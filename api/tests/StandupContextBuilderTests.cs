using DailyWork.Api.Dtos;
using DailyWork.Api.Entities;
using DailyWork.Api.Enums;
using DailyWork.Api.Prompts;
using Microsoft.Extensions.Logging.Abstractions;
using Shouldly;
using Xunit;

namespace DailyWork.Api.Tests;

public class StandupContextBuilderTests
{
	private static readonly DateOnly Today = new(2026, 4, 8);
	private static readonly DateOnly Yesterday = new(2026, 4, 7);

	private static WorkItem CreateItem(
		string title,
		DateOnly date,
		WorkItemCategory category = WorkItemCategory.SmallThing,
		bool isDone = false,
		bool isSkipped = false,
		int sortOrder = 1,
		int timesMoved = 0,
		DateOnly? originalDate = null) => new()
		{
			Title = title,
			Category = category,
			IsDone = isDone,
			IsSkipped = isSkipped,
			SortOrder = sortOrder,
			Date = date,
			WeekOf = "2026-04-06",
			TimesMoved = timesMoved,
			OriginalDate = originalDate ?? date,
		};

	[Fact]
	public void Build_SetsWeeklyGoal_WhenBigThingExists()
	{
		var items = new[]
		{
			CreateItem("Ship insights pipeline", Yesterday, WorkItemCategory.BigThing),
			CreateItem("Small task", Today),
		};

		var context = StandupContextBuilder.Build(items, Today, Yesterday, null);

		context.WeeklyGoal.ShouldBe("Ship insights pipeline");
	}

	[Fact]
	public void Build_NullWeeklyGoal_WhenNoBigThing()
	{
		var items = new[] { CreateItem("Small task", Today) };

		var context = StandupContextBuilder.Build(items, Today, Yesterday, null);

		context.WeeklyGoal.ShouldBeNull();
	}

	[Fact]
	public void Build_PicksFirstSmallThingBySortOrder_WhenMultipleYesterdayItems()
	{
		var items = new[]
		{
			CreateItem("Second task", Yesterday, sortOrder: 2),
			CreateItem("One thing", Yesterday, sortOrder: 1, isDone: true),
			CreateItem("Third task", Yesterday, sortOrder: 3),
		};

		var context = StandupContextBuilder.Build(items, Today, Yesterday, null);

		context.Yesterday.OneThing!.Title.ShouldBe("One thing");
		context.Yesterday.Others.Select(o => o.Title).ShouldBe(["Second task", "Third task"]);
	}

	[Fact]
	public void Build_StatusDone_WhenIsDone()
	{
		var items = new[] { CreateItem("Finished task", Yesterday, isDone: true) };

		var context = StandupContextBuilder.Build(items, Today, Yesterday, null);

		context.Yesterday.OneThing!.Status.ShouldBe("done");
	}

	[Fact]
	public void Build_StatusSkipped_WhenIsSkipped()
	{
		var items = new[] { CreateItem("Skipped task", Yesterday, isSkipped: true) };

		var context = StandupContextBuilder.Build(items, Today, Yesterday, null);

		context.Yesterday.OneThing!.Status.ShouldBe("skipped");
	}

	[Fact]
	public void Build_StatusNotDone_WhenNeitherDoneNorSkipped()
	{
		var items = new[] { CreateItem("Open task", Yesterday) };

		var context = StandupContextBuilder.Build(items, Today, Yesterday, null);

		context.Yesterday.OneThing!.Status.ShouldBe("notDone");
	}

	[Fact]
	public void Build_OneThingCarried_WhenYesterdayItemMovedForward()
	{
		// The only yesterday item was moved to today — its Date no longer matches yesterday
		var items = new[]
		{
			CreateItem("Carried task", Today, timesMoved: 1, originalDate: Yesterday),
			CreateItem("Fresh today task", Today, sortOrder: 2),
		};

		var context = StandupContextBuilder.Build(items, Today, Yesterday, null);

		context.Yesterday.OneThing!.Title.ShouldBe("Carried task");
		context.Yesterday.OneThing.Status.ShouldBe("carried");
		context.Today.OneThing!.Title.ShouldBe("Carried task");
	}

	[Fact]
	public void Build_IncludesCarriedItemInOthers_WhenYesterdayHadItsOwnOneThing()
	{
		var items = new[]
		{
			CreateItem("Yesterday one thing", Yesterday, sortOrder: 1, isDone: true),
			CreateItem("Moved task", Today, sortOrder: 2, timesMoved: 1, originalDate: Yesterday),
		};

		var context = StandupContextBuilder.Build(items, Today, Yesterday, null);

		context.Yesterday.OneThing!.Title.ShouldBe("Yesterday one thing");
		context.Yesterday.Others.ShouldContain(o => o.Title == "Moved task" && o.Status == "carried");
	}

	[Fact]
	public void Build_YesterdayOneThingNull_WhenNoYesterdayItems()
	{
		var items = new[] { CreateItem("Today only", Today) };

		var context = StandupContextBuilder.Build(items, Today, Yesterday, null);

		context.Yesterday.OneThing.ShouldBeNull();
		context.Yesterday.Others.ShouldBeEmpty();
	}

	[Fact]
	public void Build_PopulatesTodayOneThingAndAlsoOnDeck_WhenTodayItemsExist()
	{
		var items = new[]
		{
			CreateItem("Today one thing", Today, sortOrder: 1),
			CreateItem("Deck item A", Today, sortOrder: 2),
			CreateItem("Deck item B", Today, sortOrder: 3),
		};

		var context = StandupContextBuilder.Build(items, Today, Yesterday, null);

		context.Today.OneThing!.Title.ShouldBe("Today one thing");
		context.Today.AlsoOnDeck.ShouldBe(["Deck item A", "Deck item B"]);
	}

	[Fact]
	public void Build_ExcludesSkippedFromToday_WhenTodayItemSkipped()
	{
		var items = new[]
		{
			CreateItem("Skipped today", Today, sortOrder: 1, isSkipped: true),
			CreateItem("Active today", Today, sortOrder: 2),
		};

		var context = StandupContextBuilder.Build(items, Today, Yesterday, null);

		context.Today.OneThing!.Title.ShouldBe("Active today");
		context.Today.AlsoOnDeck.ShouldBeEmpty();
	}

	[Fact]
	public void Build_NormalizesForecastToEmptyLists_WhenForecastNull()
	{
		var items = new[] { CreateItem("Task", Today) };

		var context = StandupContextBuilder.Build(items, Today, Yesterday, null);

		context.SyncMeetings.ShouldBeEmpty();
		context.UpcomingPto.ShouldBeEmpty();
	}

	[Fact]
	public void Build_PassesThroughForecastLists_WhenForecastProvided()
	{
		var items = new[] { CreateItem("Task", Today) };
		var forecast = new StandupForecast(
			["Ali / Jared"],
			[new StandupPto("Family Time", "2026-07-24", "2026-07-30")]);

		var context = StandupContextBuilder.Build(items, Today, Yesterday, forecast);

		context.SyncMeetings.ShouldBe(["Ali / Jared"]);
		context.UpcomingPto.ShouldHaveSingleItem().Title.ShouldBe("Family Time");
	}

	[Fact]
	public void TryParseForecast_ReturnsNull_WhenMalformedJson()
	{
		var forecast = StandupContextBuilder.TryParseForecast("not json{{", NullLogger.Instance);

		forecast.ShouldBeNull();
	}

	[Fact]
	public void TryParseForecast_ReturnsNull_WhenNullOrWhitespace()
	{
		StandupContextBuilder.TryParseForecast(null, NullLogger.Instance).ShouldBeNull();
		StandupContextBuilder.TryParseForecast("   ", NullLogger.Instance).ShouldBeNull();
	}

	[Fact]
	public void TryParseForecast_ToleratesMissingAndExtraFields_WhenPartialJson()
	{
		var json = """
			{
				"date": "2026-07-16",
				"meetings": { "count": 3, "totalHours": 2.5 },
				"focusTime": { "count": 2, "totalHours": 4 },
				"upcomingPTO": [{ "title": "🌴 Family Time", "start": "2026-07-24", "end": "2026-07-30", "allDay": true, "eventType": "oof" }]
			}
			""";

		var forecast = StandupContextBuilder.TryParseForecast(json, NullLogger.Instance);

		forecast.ShouldNotBeNull();
		forecast.SyncMeetings.ShouldBeNull();
		forecast.UpcomingPto.ShouldHaveSingleItem().Title.ShouldBe("🌴 Family Time");
	}
}
