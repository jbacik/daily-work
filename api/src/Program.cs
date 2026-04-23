using Azure.Identity;
using DailyWork.Api;
using DailyWork.Api.Data;
using DailyWork.Api.Endpoints;
using Microsoft.EntityFrameworkCore;
using Microsoft.SemanticKernel;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

builder.AddNpgsqlDbContext<AppDbContext>("dailywork");
builder.Services.AddSingleton<IDateTimeProvider, SystemDateTimeProvider>();

var aoaiEndpoint = builder.Configuration["AzureOpenAI:Endpoint"];
var aoaiKey = builder.Configuration["AzureOpenAI:ApiKey"];
var aoaiDeployment = builder.Configuration["AzureOpenAI:DeploymentName"];

if (!string.IsNullOrEmpty(aoaiEndpoint) && !string.IsNullOrEmpty(aoaiDeployment))
{
	if (!string.IsNullOrEmpty(aoaiKey))
		builder.Services.AddAzureOpenAIChatCompletion(aoaiDeployment, aoaiEndpoint, aoaiKey);
	else
		builder.Services.AddAzureOpenAIChatCompletion(aoaiDeployment, aoaiEndpoint, new DefaultAzureCredential());
}

builder.Services.AddCors(options =>
	options.AddDefaultPolicy(policy =>
		policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

builder.Services.ConfigureHttpJsonOptions(options =>
	options.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));

var app = builder.Build();

// Auto-migrate on startup
using (var scope = app.Services.CreateScope())
{
	var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
	db.Database.Migrate();
}

app.UseCors();

app.MapDefaultEndpoints();
app.MapWorkItemEndpoints();
app.MapReadWatchEndpoints();
app.MapStandupEndpoints();
app.MapScratchPadEndpoints();
app.MapCalendarEndpoints();

app.Run();
