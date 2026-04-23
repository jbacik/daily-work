using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;

namespace DailyWork.Api.Tests.Fixtures;

public class FakeChatCompletionService : IChatCompletionService
{
	public string ResponseContent { get; set; } = "**Mock standup response**";
	public ChatHistory? LastChatHistory { get; private set; }

	public IReadOnlyDictionary<string, object?> Attributes { get; } = new Dictionary<string, object?>();

	public Task<IReadOnlyList<ChatMessageContent>> GetChatMessageContentsAsync(
		ChatHistory chatHistory,
		PromptExecutionSettings? executionSettings = null,
		Kernel? kernel = null,
		CancellationToken cancellationToken = default)
	{
		LastChatHistory = chatHistory;
		IReadOnlyList<ChatMessageContent> result = [new ChatMessageContent(AuthorRole.Assistant, ResponseContent)];
		return Task.FromResult(result);
	}

	public IAsyncEnumerable<StreamingChatMessageContent> GetStreamingChatMessageContentsAsync(
		ChatHistory chatHistory,
		PromptExecutionSettings? executionSettings = null,
		Kernel? kernel = null,
		CancellationToken cancellationToken = default)
	{
		throw new NotImplementedException();
	}
}
