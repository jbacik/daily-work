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
		var json = """[{"id":1,"title":"Test"}]""";

		var message = StandupPrompts.BuildUserMessage(json, "2026-04-07", "2026-04-06");

		message.ShouldContain("Today's date: 2026-04-07");
		message.ShouldContain("Yesterday's date: 2026-04-06");
		message.ShouldContain(json);
		message.ShouldNotContain("Learning queue");
	}

	[Fact]
	public void BuildUserMessage_IncludesLearningQueue_WhenProvided()
	{
		var workJson = """[{"id":1,"title":"Test"}]""";
		var learningJson = """[{"title":"Cool experiment","type":"Experiment"}]""";

		var message = StandupPrompts.BuildUserMessage(workJson, "2026-04-10", "2026-04-09", learningJson);

		message.ShouldContain("Today's date: 2026-04-10");
		message.ShouldContain("Yesterday's date: 2026-04-09");
		message.ShouldContain(workJson);
		message.ShouldContain("Learning queue items consumed this week");
		message.ShouldContain(learningJson);
	}
}
