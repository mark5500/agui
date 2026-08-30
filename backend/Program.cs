using AguiBackend;
using Microsoft.Extensions.AI;
using OpenAI;

const string DevCorsPolicy = "frontend";

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy(DevCorsPolicy, policy => policy
        .WithOrigins("http://localhost:3000", "http://localhost:5173")
        .AllowAnyHeader()
        .AllowAnyMethod());
});

builder.Services.AddAGUI();

var openAiApiKey = builder.Configuration["OPENAI_API_KEY"];
if (!string.IsNullOrEmpty(openAiApiKey))
{
    var model = builder.Configuration["OPENAI_MODEL"] ?? "gpt-4o-mini";
    builder.Services
        .AddChatClient(new OpenAIClient(openAiApiKey).GetChatClient(model).AsIChatClient())
        .UseFunctionInvocation();
}
else
{
    builder.Services.AddSingleton<FakeChatClient>();
    builder.Services.AddChatClient(sp => sp.GetRequiredService<FakeChatClient>());
}

var app = builder.Build();

app.UseCors(DevCorsPolicy);

app.MapAGUI("/api/agent");

app.Run();
