using DailyWork.Api.Dtos;
using DailyWork.Api.Prompts;
using Microsoft.SemanticKernel.ChatCompletion;

namespace DailyWork.Api.Endpoints;

internal static class CalendarEndpoints
{
	public static RouteGroupBuilder MapCalendarEndpoints(this WebApplication app)
	{
		var group = app.MapGroup("/api/calendar");

		group.MapPost("/evaluate", async (
			IWebHostEnvironment env,
			IChatCompletionService? chatService,
			EvaluateCalendarDto dto) =>
		{
			if (chatService is null)
				return Results.Problem("Azure OpenAI is not configured.", statusCode: 503);

			var safeName = Path.GetFileName(dto.FileName);
			var filePath = Path.Combine(env.ContentRootPath, "Resources", safeName);

			if (!File.Exists(filePath))
				return Results.Problem($"Calendar file '{safeName}' not found.", statusCode: 404);

			var calendarJson = await File.ReadAllTextAsync(filePath);

			var chatHistory = new ChatHistory();
			chatHistory.AddSystemMessage(CalendarPrompts.GetSystemPrompt());
			chatHistory.AddUserMessage(CalendarPrompts.BuildUserMessage(calendarJson));

			var response = await chatService.GetChatMessageContentAsync(chatHistory);

			return Results.Ok(new { markdown = response.Content });
		});

		return group;
	}
}
