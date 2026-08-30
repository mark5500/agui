using System.Runtime.CompilerServices;
using Microsoft.Extensions.AI;

namespace AguiBackend;

/// <summary>
/// Deterministic <see cref="IChatClient"/> used when no OpenAI API key is configured, so the
/// sample is runnable end-to-end without LLM credentials.
/// </summary>
internal sealed class FakeChatClient : IChatClient
{
    // Scripted stand-in for real tool-calling: a real IChatClient would emit this
    // FunctionCallContent itself when the model decides to call a registered tool.
    private static readonly string[] KnownColors =
    [
        "red", "green", "blue", "yellow", "orange", "purple", "pink", "black", "white", "gray"
    ];

    public void Dispose()
    {
    }

    public object? GetService(Type serviceType, object? serviceKey = null) =>
        serviceType == typeof(IChatClient) ? this : null;

    public Task<ChatResponse> GetResponseAsync(
        IEnumerable<ChatMessage> messages,
        ChatOptions? options = null,
        CancellationToken cancellationToken = default) =>
        throw new NotSupportedException("Use GetStreamingResponseAsync for AG-UI.");

    public async IAsyncEnumerable<ChatResponseUpdate> GetStreamingResponseAsync(
        IEnumerable<ChatMessage> messages,
        ChatOptions? options = null,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var messageList = messages as IReadOnlyList<ChatMessage> ?? messages.ToList();
        var lastUserIndex = -1;
        for (var i = messageList.Count - 1; i >= 0; i--)
        {
            if (messageList[i].Role != ChatRole.User) continue;
            lastUserIndex = i;
            break;
        }
        var lastUserText = lastUserIndex >= 0 ? messageList[lastUserIndex].Text : string.Empty;
        var color = KnownColors.FirstOrDefault(c =>
            lastUserText.Contains(c, StringComparison.OrdinalIgnoreCase));

        // A continuation turn (after addToolResult) re-sends the same last user message with
        // no new one after it, so re-checking lastUserText would script set_background_color
        // again on every follow-up turn forever. Only script it if this user turn hasn't
        // already produced a tool result (i.e. no tool message after it yet).
        var alreadyCalledTool = lastUserIndex >= 0 &&
            messageList.Skip(lastUserIndex + 1).Any(m => m.Role == ChatRole.Tool);

        if (color is not null && !alreadyCalledTool)
        {
            await foreach (var update in StreamTextAsync(
                $"Sure, changing the background to {color}.",
                cancellationToken))
            {
                yield return update;
            }

            yield return new ChatResponseUpdate
            {
                Role = ChatRole.Assistant,
                Contents =
                [
                    new FunctionCallContent(
                        Guid.NewGuid().ToString("N"),
                        "set_background_color",
                        new Dictionary<string, object?> { ["color"] = color })
                ],
                ModelId = "fake-model",
            };
            yield break;
        }

        await foreach (var update in StreamTextAsync(
            $"(no OPENAI_API_KEY configured) You said: \"{lastUserText}\"",
            cancellationToken))
        {
            yield return update;
        }
    }

    private static async IAsyncEnumerable<ChatResponseUpdate> StreamTextAsync(
        string text,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var messageId = Guid.NewGuid().ToString("N");

        foreach (var word in text.Split(' '))
        {
            await Task.Delay(30, cancellationToken).ConfigureAwait(false);
            yield return new ChatResponseUpdate
            {
                MessageId = messageId,
                Role = ChatRole.Assistant,
                Contents = [new TextContent(word + " ")],
                ModelId = "fake-model",
            };
        }
    }
}
