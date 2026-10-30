using SaaSApp.Api.Configuration;

namespace SaaSApp.Api.Tests;

public class HangfireStorageSchemaTests
{
    [Fact]
    public void Resolve_NotConfigured_Development_UsesLocalSchema()
    {
        Assert.Equal("hangfire_local", HangfireStorageSchema.Resolve(null, isDevelopment: true));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Resolve_NotConfigured_Production_UsesProductionSchema(string? configured)
    {
        Assert.Equal("hangfire", HangfireStorageSchema.Resolve(configured, isDevelopment: false));
    }

    [Theory]
    [InlineData("hangfire_arasu", true)]
    [InlineData("hangfire_arasu", false)]
    [InlineData("hangfire", true)]
    [InlineData(" hangfire_test ", false)]
    public void Resolve_Configured_UsesConfiguredSchema(string configured, bool isDevelopment)
    {
        Assert.Equal(configured.Trim(), HangfireStorageSchema.Resolve(configured, isDevelopment));
    }

    [Theory]
    [InlineData("Hangfire")]
    [InlineData("hangfire-local")]
    [InlineData("hangfire; drop table x")]
    [InlineData("1hangfire")]
    public void Resolve_InvalidSchemaName_Throws(string configured)
    {
        Assert.Throws<InvalidOperationException>(() => HangfireStorageSchema.Resolve(configured, isDevelopment: true));
    }

    [Fact]
    public void PrepareSchemaIfNecessary_ProductionSchema_IsSkipped()
    {
        Assert.False(HangfireStorageSchema.PrepareSchemaIfNecessary("hangfire"));
    }

    [Theory]
    [InlineData("hangfire_local")]
    [InlineData("hangfire_arasu")]
    public void PrepareSchemaIfNecessary_OtherSchema_IsCreated(string schema)
    {
        Assert.True(HangfireStorageSchema.PrepareSchemaIfNecessary(schema));
    }
}
