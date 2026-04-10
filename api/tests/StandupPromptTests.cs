using DailyWork.Api.Prompts;
using Xunit;

namespace DailyWork.Api.Tests;

public class StandupPromptTests
{
    [Fact]
    public void GetSystemPrompt_ReturnsMidWeekPrompt_WhenTuesday()
    {
        var prompt = StandupPrompts.GetSystemPrompt(DayOfWeek.Tuesday);

        Assert.Contains("Did you complete your One Thing yesterday", prompt);
        Assert.Contains("What's the One Thing you will complete today", prompt);
    }

    [Fact]
    public void GetSystemPrompt_ReturnsMidWeekPrompt_WhenWednesday()
    {
        var prompt = StandupPrompts.GetSystemPrompt(DayOfWeek.Wednesday);

        Assert.Contains("Did you complete your One Thing yesterday", prompt);
    }

    [Fact]
    public void GetSystemPrompt_ReturnsMidWeekPrompt_WhenThursday()
    {
        var prompt = StandupPrompts.GetSystemPrompt(DayOfWeek.Thursday);

        Assert.Contains("Did you complete your One Thing yesterday", prompt);
    }

    [Fact]
    public void GetSystemPrompt_ReturnsMondayPrompt_WhenMonday()
    {
        var prompt = StandupPrompts.GetSystemPrompt(DayOfWeek.Monday);

        Assert.Contains("Monday", prompt);
    }

    [Fact]
    public void GetSystemPrompt_ReturnsFridayPrompt_WhenFriday()
    {
        var prompt = StandupPrompts.GetSystemPrompt(DayOfWeek.Friday);

        Assert.Contains("Did you complete your One Thing yesterday", prompt);
        Assert.Contains("What's the One Thing you will complete today", prompt);
        Assert.Contains("experiment, improvement, or lesson", prompt);
        Assert.Contains("Experiment", prompt);
        Assert.Contains("worthSharing", prompt);
    }

    [Fact]
    public void GetSystemPrompt_ReturnsMidWeekPrompt_WhenWeekend()
    {
        var saturday = StandupPrompts.GetSystemPrompt(DayOfWeek.Saturday);
        var sunday = StandupPrompts.GetSystemPrompt(DayOfWeek.Sunday);

        Assert.Contains("Did you complete your One Thing yesterday", saturday);
        Assert.Contains("Did you complete your One Thing yesterday", sunday);
    }

    [Fact]
    public void BuildUserMessage_IncludesTodayAndJson()
    {
        var json = """[{"id":1,"title":"Test"}]""";

        var message = StandupPrompts.BuildUserMessage(json, "2026-04-07");

        Assert.Contains("Today's date: 2026-04-07", message);
        Assert.Contains(json, message);
        Assert.DoesNotContain("Learning queue", message);
    }

    [Fact]
    public void BuildUserMessage_IncludesLearningQueue_WhenProvided()
    {
        var workJson = """[{"id":1,"title":"Test"}]""";
        var learningJson = """[{"title":"Cool experiment","type":"Experiment"}]""";

        var message = StandupPrompts.BuildUserMessage(workJson, "2026-04-10", learningJson);

        Assert.Contains("Today's date: 2026-04-10", message);
        Assert.Contains(workJson, message);
        Assert.Contains("Learning queue items consumed this week", message);
        Assert.Contains(learningJson, message);
    }
}
