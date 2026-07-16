using DailyWork.Api.Prompts;
using Shouldly;
using Xunit;

namespace DailyWork.Api.Tests;

public class StandupPromptTests
{
	[Fact]
	public void GetSystemPrompt_ReturnsMidWeekPrompt_WhenTuesday()
	{
		var prompt = StandupPrompts.GetSystemPrompt(DayOfWeek.Tuesday);

		prompt.ShouldContain("Did you complete your One Thing yesterday");
		prompt.ShouldContain("What's the One Thing you will complete today");
	}

	[Fact]
	public void GetSystemPrompt_ReturnsMidWeekPrompt_WhenWednesday()
	{
		var prompt = StandupPrompts.GetSystemPrompt(DayOfWeek.Wednesday);

		prompt.ShouldContain("Did you complete your One Thing yesterday");
	}

	[Fact]
	public void GetSystemPrompt_ReturnsMidWeekPrompt_WhenThursday()
	{
		var prompt = StandupPrompts.GetSystemPrompt(DayOfWeek.Thursday);

		prompt.ShouldContain("Did you complete your One Thing yesterday");
	}

	[Fact]
	public void GetSystemPrompt_ReturnsMondayPrompt_WhenMonday()
	{
		var prompt = StandupPrompts.GetSystemPrompt(DayOfWeek.Monday);

		prompt.ShouldContain("Monday");
	}

	[Fact]
	public void GetSystemPrompt_ReturnsFridayPrompt_WhenFriday()
	{
		var prompt = StandupPrompts.GetSystemPrompt(DayOfWeek.Friday);

		prompt.ShouldContain("Did you complete your One Thing yesterday");
		prompt.ShouldContain("What's the One Thing you will complete today");
		prompt.ShouldContain("experiment, improvement, or lesson");
		prompt.ShouldContain("Experiment");
		prompt.ShouldContain("worthSharing");
	}

	[Fact]
	public void GetSystemPrompt_ReturnsMidWeekPrompt_WhenWeekend()
	{
		var saturday = StandupPrompts.GetSystemPrompt(DayOfWeek.Saturday);
		var sunday = StandupPrompts.GetSystemPrompt(DayOfWeek.Sunday);

		saturday.ShouldContain("Did you complete your One Thing yesterday");
		sunday.ShouldContain("Did you complete your One Thing yesterday");
	}

	[Fact]
	public void BuildUserMessage_IncludesTodayAndYesterdayAndJson()
	{
		var contextJson = """{"weeklyGoal":"Test goal"}""";

		var message = StandupPrompts.BuildUserMessage("2026-04-07", "2026-04-06", contextJson, null);

		message.ShouldContain("Today's date: 2026-04-07");
		message.ShouldContain("Yesterday's date: 2026-04-06");
		message.ShouldContain("Standup context:");
		message.ShouldContain(contextJson);
		message.ShouldNotContain("Learning queue");
	}

	[Fact]
	public void BuildUserMessage_IncludesLearningQueue_WhenProvided()
	{
		var contextJson = """{"weeklyGoal":"Test goal"}""";
		var learningJson = """[{"title":"Cool experiment","type":"Experiment"}]""";

		var message = StandupPrompts.BuildUserMessage("2026-04-10", "2026-04-09", contextJson, null, learningJson);

		message.ShouldContain("Today's date: 2026-04-10");
		message.ShouldContain("Yesterday's date: 2026-04-09");
		message.ShouldContain(contextJson);
		message.ShouldContain("Learning queue items consumed this week");
		message.ShouldContain(learningJson);
	}

	[Fact]
	public void BuildUserMessage_IncludesOpenerLine_WhenOpenerProvided()
	{
		var message = StandupPrompts.BuildUserMessage("2026-04-07", "2026-04-06", "{}", "Crushed it.");

		message.ShouldContain("Open the first answer with exactly: \"Crushed it.\"");
	}

	[Fact]
	public void BuildUserMessage_OmitsOpenerLine_WhenOpenerNull()
	{
		var message = StandupPrompts.BuildUserMessage("2026-04-07", "2026-04-06", "{}", null);

		message.ShouldNotContain("Open the first answer");
	}

	[Fact]
	public void BuildWeeklyUserMessage_IncludesDatesAndWorkItems()
	{
		var workJson = """[{"id":1,"title":"Test"}]""";

		var message = StandupPrompts.BuildWeeklyUserMessage(workJson, "2026-04-07", "2026-04-06");

		message.ShouldContain("Today's date: 2026-04-07");
		message.ShouldContain("Yesterday's date: 2026-04-06");
		message.ShouldContain("Work items:");
		message.ShouldContain(workJson);
	}

	[Fact]
	public void PickOpener_ReturnsDoneBucketOpener_WhenStatusDone()
	{
		var opener = StandupPrompts.PickOpener("done", null);

		StandupPrompts.DoneOpeners.ShouldContain(opener);
	}

	[Fact]
	public void PickOpener_ReturnsPartialBucketOpener_WhenStatusCarried()
	{
		var opener = StandupPrompts.PickOpener("carried", null);

		StandupPrompts.PartialOpeners.ShouldContain(opener);
	}

	[Fact]
	public void PickOpener_ReturnsNotDoneBucketOpener_WhenStatusSkipped()
	{
		var opener = StandupPrompts.PickOpener("skipped", null);

		StandupPrompts.NotDoneOpeners.ShouldContain(opener);
	}

	[Fact]
	public void PickOpener_ReturnsNull_WhenStatusNull()
	{
		var opener = StandupPrompts.PickOpener(null, null);

		opener.ShouldBeNull();
	}

	[Fact]
	public void PickOpener_ExcludesPreviousOpener_WhenPresentInMarkdown()
	{
		var previousMarkdown = "### Did you complete your One Thing yesterday?\nCrushed it. — got **Thing** done.";

		for (var i = 0; i < 50; i++)
		{
			var opener = StandupPrompts.PickOpener("done", previousMarkdown);

			opener.ShouldNotBe("Crushed it.");
			StandupPrompts.DoneOpeners.ShouldContain(opener);
		}
	}

	[Fact]
	public void PickOpener_FallsBackToFullBucket_WhenAllOpenersInPreviousMarkdown()
	{
		var previousMarkdown = string.Join(" ", StandupPrompts.DoneOpeners);

		var opener = StandupPrompts.PickOpener("done", previousMarkdown);

		StandupPrompts.DoneOpeners.ShouldContain(opener);
	}

	[Fact]
	public void GetSystemPrompt_OmitsConcreteExampleGoal_WhenMidWeek()
	{
		var prompt = StandupPrompts.GetSystemPrompt(DayOfWeek.Tuesday);

		prompt.ShouldNotContain("Data Products support");
		prompt.ShouldContain("never a goal from an example");
	}

	[Fact]
	public void GetSystemPrompt_OmitsConcreteExampleGoal_WhenFriday()
	{
		var prompt = StandupPrompts.GetSystemPrompt(DayOfWeek.Friday);

		prompt.ShouldNotContain("Data Products support");
		prompt.ShouldContain("never a goal from an example");
	}

	[Fact]
	public void GetSystemPrompt_MentionsUpcomingPTO_WhenMidWeek()
	{
		var prompt = StandupPrompts.GetSystemPrompt(DayOfWeek.Tuesday);

		prompt.ShouldContain("upcomingPTO");
		prompt.ShouldContain("syncMeetings");
	}

	[Fact]
	public void GetSystemPrompt_MentionsUpcomingPTO_WhenFriday()
	{
		var prompt = StandupPrompts.GetSystemPrompt(DayOfWeek.Friday);

		prompt.ShouldContain("upcomingPTO");
		prompt.ShouldContain("syncMeetings");
	}
}
