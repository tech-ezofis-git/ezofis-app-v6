using System.Text.RegularExpressions;

namespace SaaSApp.Api.Configuration;

/// <summary>
/// Picks the Postgres schema Hangfire stores its jobs in. Production uses the existing
/// "hangfire" schema; a developer machine (Development) defaults to "hangfire_local", so a
/// local API never queues jobs that the production server would pick up and run.
/// Override with Hangfire:SchemaName.
/// </summary>
public static partial class HangfireStorageSchema
{
    public const string Production = "hangfire";
    public const string LocalDefault = "hangfire_local";

    public static string Resolve(string? configured, bool isDevelopment)
    {
        if (string.IsNullOrWhiteSpace(configured))
            return isDevelopment ? LocalDefault : Production;

        var schema = configured.Trim();
        if (!ValidSchemaName().IsMatch(schema))
            throw new InvalidOperationException(
                $"Hangfire:SchemaName '{schema}' is not a valid schema name (lowercase letters, digits and _, max 63 characters).");
        return schema;
    }

    /// <summary>
    /// The production schema already exists and must not be auto-migrated (that loops and hangs
    /// /hangfire); any other schema is created by Hangfire on first start.
    /// </summary>
    public static bool PrepareSchemaIfNecessary(string schema) =>
        !string.Equals(schema, Production, StringComparison.Ordinal);

    [GeneratedRegex("^[a-z_][a-z0-9_]{0,62}$")]
    private static partial Regex ValidSchemaName();
}
