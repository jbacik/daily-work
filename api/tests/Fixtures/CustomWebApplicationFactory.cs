using DailyWork.Api;
using DailyWork.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.SemanticKernel.ChatCompletion;
using Npgsql;
using Respawn;
using Testcontainers.PostgreSql;
using Xunit;

namespace DailyWork.Api.Tests.Fixtures;

public class CustomWebApplicationFactory : WebApplicationFactory<IApiMarker>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _db = new PostgreSqlBuilder("postgres:16.8-alpine")
        .Build();

    private Respawner _respawner = null!;

    public FakeDateTimeProvider DateTimeProvider { get; } = new FakeDateTimeProvider();
    public FakeChatCompletionService ChatCompletionService { get; } = new();

    async Task IAsyncLifetime.InitializeAsync()
    {
        await _db.StartAsync();

        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();

        await using var conn = new NpgsqlConnection(_db.GetConnectionString());
        await conn.OpenAsync();
        _respawner = await Respawner.CreateAsync(conn, new RespawnerOptions
        {
            DbAdapter = DbAdapter.Postgres,
            SchemasToInclude = ["public"],
            TablesToIgnore = [new Respawn.Graph.Table("__EFMigrationsHistory")],
        });
    }

    public async Task ResetDatabaseAsync()
    {
        await using var conn = new NpgsqlConnection(_db.GetConnectionString());
        await conn.OpenAsync();
        await _respawner.ResetAsync(conn);
    }

    async Task IAsyncLifetime.DisposeAsync() => await _db.DisposeAsync();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Remove all AppDbContext-related registrations — Aspire registers a context pool
            // (singleton) that must be fully replaced, not just the options descriptor.
            var toRemove = services
                .Where(d =>
                    d.ServiceType == typeof(AppDbContext) ||
                    (d.ServiceType.IsGenericType &&
                     d.ServiceType.GetGenericArguments().Any(t => t == typeof(AppDbContext))) ||
                    (d.ImplementationType?.IsGenericType == true &&
                     d.ImplementationType.GetGenericArguments().Any(t => t == typeof(AppDbContext))))
                .ToList();

            foreach (var d in toRemove)
            {
                services.Remove(d);
            }

            services.AddDbContext<AppDbContext>(options =>
                options.UseNpgsql(_db.GetConnectionString()));

            services.AddSingleton<IDateTimeProvider>(DateTimeProvider);
            services.AddSingleton<IChatCompletionService>(ChatCompletionService);
        });
    }
}
