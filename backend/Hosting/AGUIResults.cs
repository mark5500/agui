using AGUI.Abstractions;
using AGUI.Formatting;
using Microsoft.Net.Http.Headers;

namespace AguiBackend.Hosting;

/// <summary>
/// Factory methods for AG-UI <see cref="IResult"/> values that negotiate the response
/// transport format from the request <c>Accept</c> header (SSE, falling back from protobuf).
/// </summary>
internal static class AGUIResults
{
    private const string ProtobufMediaType = "application/vnd.ag-ui.event+proto";

    public static IResult Events(
        IAsyncEnumerable<BaseEvent> events,
        HttpContext context,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(events);
        ArgumentNullException.ThrowIfNull(context);

        var formatters = CollectFormatters(context);
        var chosen = Negotiate(context.Request, formatters);

        if (chosen is null)
        {
            return Results.StatusCode(StatusCodes.Status406NotAcceptable);
        }

        return new AGUIEventStreamResult(events, chosen, cancellationToken);
    }

    private static IReadOnlyList<IAGUIEventStreamFormatter> CollectFormatters(HttpContext context)
    {
        var registered = context.RequestServices.GetServices<IAGUIEventStreamFormatter>();

        var formatters = new List<IAGUIEventStreamFormatter>();
        var hasSse = false;
        foreach (var formatter in registered)
        {
            formatters.Add(formatter);
            if (string.Equals(formatter.MediaType, SseEventStreamFormatter.ServerSentEventsMediaType, StringComparison.OrdinalIgnoreCase))
            {
                hasSse = true;
            }
        }

        if (!hasSse)
        {
            formatters.Add(new SseEventStreamFormatter());
        }

        return formatters;
    }

    private static IAGUIEventStreamFormatter? Negotiate(
        HttpRequest request,
        IReadOnlyList<IAGUIEventStreamFormatter> formatters)
    {
        var accepted = ParseAccept(request);

        var protoFormatter = formatters.FirstOrDefault(
            f => string.Equals(f.MediaType, ProtobufMediaType, StringComparison.OrdinalIgnoreCase));
        if (protoFormatter is not null && IsExplicitlyAcceptable(ProtobufMediaType, accepted))
        {
            return protoFormatter;
        }

        var sseFormatter = formatters.FirstOrDefault(
            f => string.Equals(f.MediaType, SseEventStreamFormatter.ServerSentEventsMediaType, StringComparison.OrdinalIgnoreCase));
        if (sseFormatter is not null && IsSseAcceptable(accepted))
        {
            return sseFormatter;
        }

        return null;
    }

    private static IReadOnlyList<MediaTypeHeaderValue> ParseAccept(HttpRequest request)
    {
        var values = request.Headers.Accept;
        if (values.Count == 0)
        {
            return [];
        }

        if (MediaTypeHeaderValue.TryParseList(values, out var parsed) && parsed is not null)
        {
            return [.. parsed];
        }

        return [];
    }

    private static bool IsExplicitlyAcceptable(
        string mediaType,
        IReadOnlyList<MediaTypeHeaderValue> accepted)
    {
        foreach (var entry in accepted)
        {
            if (QualityAllows(entry) && entry.MediaType.Equals(mediaType, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private static bool IsSseAcceptable(IReadOnlyList<MediaTypeHeaderValue> accepted)
    {
        if (accepted.Count == 0)
        {
            return true;
        }

        var sse = new MediaTypeHeaderValue(SseEventStreamFormatter.ServerSentEventsMediaType);
        foreach (var entry in accepted)
        {
            if (QualityAllows(entry) && sse.IsSubsetOf(entry))
            {
                return true;
            }
        }

        return false;
    }

    private static bool QualityAllows(MediaTypeHeaderValue entry)
    {
        return !entry.Quality.HasValue || entry.Quality.Value > 0;
    }
}
