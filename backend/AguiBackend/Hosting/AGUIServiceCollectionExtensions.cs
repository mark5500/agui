using AGUI.Abstractions;
using AGUI.Formatting;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Microsoft.Extensions.DependencyInjection;

internal static class AGUIServiceCollectionExtensions
{
    /// <summary>
    /// Registers the built-in SSE formatter and configures AG-UI JSON serialization.
    /// </summary>
    public static IServiceCollection AddAGUI(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.TryAddEnumerable(
            ServiceDescriptor.Singleton<IAGUIEventStreamFormatter, SseEventStreamFormatter>());

        services.Configure<JsonOptions>(options =>
        {
            options.SerializerOptions.TypeInfoResolverChain.Add(AIJsonUtilities.DefaultOptions.TypeInfoResolver!);
            options.SerializerOptions.TypeInfoResolverChain.Add(AGUIJsonSerializerContext.Default);
            AGUIJsonUtilities.RegisterInterruptContentTypes(options.SerializerOptions);
        });

        return services;
    }
}
