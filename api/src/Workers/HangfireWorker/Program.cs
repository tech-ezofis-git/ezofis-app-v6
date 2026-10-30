using Hangfire;
using Hangfire.PostgreSql;
using Serilog;

var builder = Host.CreateApplicationBuilder(args);

builder.Logging.ClearProviders();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is required.");

// Production runs its one Hangfire server inside the API (Hangfire:RunServerInApi), not this worker.
// So this worker defaults to its own schema: started on a laptop against the shared database, it
// must not pick up production jobs. Set Hangfire:SchemaName=hangfire only on purpose.
var schemaName = builder.Configuration["Hangfire:SchemaName"];
if (string.IsNullOrWhiteSpace(schemaName))
    schemaName = "hangfire_local";

builder.Services.AddHangfire(config => config
    .SetDataCompatibilityLevel(Hangfire.CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UsePostgreSqlStorage(connectionString, new PostgreSqlStorageOptions
    {
        SchemaName = schemaName,
        // The production "hangfire" schema exists already and must not be auto-migrated.
        PrepareSchemaIfNecessary = schemaName != "hangfire",
    }));

builder.Services.AddHangfireServer(options =>
    options.WorkerCount = builder.Configuration.GetValue<int?>("Hangfire:WorkerCount") ?? 5);

var host = builder.Build();

try
{
    Log.Information("Starting SaaSApp Hangfire worker on schema {HangfireSchema}", schemaName);
    host.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Hangfire worker terminated unexpectedly");
}
finally
{
    await Log.CloseAndFlushAsync();
}
