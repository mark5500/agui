using AGUI.Abstractions;
using AGUI.Server;
using AguiBackend.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Options;

using JsonOptions = Microsoft.AspNetCore.Http.Json.JsonOptions;

namespace Microsoft.AspNetCore.Builder;

internal static class AGUIEndpointRouteBuilderExtensions
{
    /// <summary>
    /// Maps a POST endpoint that adapts an incoming <see cref="RunAgentInput"/> to
    /// Microsoft.Extensions.AI, streams the response from the registered <see cref="IChatClient"/>,
    /// and negotiates the wire transport (SSE) via <see cref="AGUIResults.Events"/>.
    /// </summary>
    public static IEndpointConventionBuilder MapAGUI(
        this IEndpointRouteBuilder endpoints,
        string pattern)
    {
        return endpoints.MapPost(pattern, (
            [FromBody] RunAgentInput input,
            [FromServices] IChatClient chatClient,
            [FromServices] IOptions<JsonOptions> jsonOptions,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            var jsonSerializerOptions = jsonOptions.Value.SerializerOptions;

            var ctx = input.ToChatRequestContext(jsonSerializerOptions);

            var updates = chatClient.GetStreamingResponseAsync(ctx.Messages, ctx.ChatOptions, cancellationToken);

            var events = updates.AsAGUIEventStreamAsync(ctx, cancellationToken);

            return AGUIResults.Events(events, httpContext, cancellationToken);
        });
    }
}
