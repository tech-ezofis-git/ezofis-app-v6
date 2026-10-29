using System.Text;
using Hangfire;
using Hangfire.Dashboard;
using Hangfire.Storage;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using SaaSApp.Api.Configuration;

namespace SaaSApp.Api.Tests;

public class HangfireDashboardBasicAuthFilterTests
{
    private const string User = "ops-admin";
    private const string Password = "correct-horse-battery";

    private static string Basic(string credentials) =>
        "Basic " + Convert.ToBase64String(Encoding.UTF8.GetBytes(credentials));

    [Fact]
    public void IsAuthorized_CorrectCredentials_ReturnsTrue()
    {
        var filter = new HangfireDashboardBasicAuthFilter(User, Password);

        Assert.True(filter.IsAuthorized(Basic($"{User}:{Password}")));
    }

    [Fact]
    public void IsAuthorized_PasswordContainingColon_ReturnsTrue()
    {
        var filter = new HangfireDashboardBasicAuthFilter(User, "pass:with:colons");

        Assert.True(filter.IsAuthorized(Basic($"{User}:pass:with:colons")));
    }

    [Theory]
    [InlineData("ops-admin:wrong-password-1")]
    [InlineData("someone-else:correct-horse-battery")]
    [InlineData("ops-admin:")]
    [InlineData(":correct-horse-battery")]
    [InlineData("no-separator")]
    public void IsAuthorized_WrongCredentials_ReturnsFalse(string credentials)
    {
        var filter = new HangfireDashboardBasicAuthFilter(User, Password);

        Assert.False(filter.IsAuthorized(Basic(credentials)));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("Basic")]
    [InlineData("Basic not-base64!!")]
    [InlineData("Bearer some.jwt.token")]
    public void IsAuthorized_MissingOrMalformedHeader_ReturnsFalse(string? header)
    {
        var filter = new HangfireDashboardBasicAuthFilter(User, Password);

        Assert.False(filter.IsAuthorized(header));
    }

    [Theory]
    [InlineData(null, Password)]
    [InlineData("", Password)]
    [InlineData(User, null)]
    [InlineData(User, "")]
    [InlineData(User, "short-11chr")]
    public void TryCreate_MissingOrWeakSettings_ReturnsNull(string? user, string? password)
    {
        Assert.Null(HangfireDashboardBasicAuthFilter.TryCreate(user, password));
    }

    [Fact]
    public void TryCreate_ValidSettings_ReturnsFilter()
    {
        Assert.NotNull(HangfireDashboardBasicAuthFilter.TryCreate(User, Password));
    }

    [Fact]
    public void Authorize_NoCredentials_DeniesAndAsksBrowserToLogIn()
    {
        var filter = new HangfireDashboardBasicAuthFilter(User, Password);
        var httpContext = new DefaultHttpContext();

        var allowed = filter.Authorize(CreateContext(httpContext));

        Assert.False(allowed);
        Assert.StartsWith("Basic realm=", httpContext.Response.Headers.WWWAuthenticate.ToString());
    }

    [Fact]
    public void Authorize_CorrectCredentials_Allows()
    {
        var filter = new HangfireDashboardBasicAuthFilter(User, Password);
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers.Authorization = Basic($"{User}:{Password}");

        Assert.True(filter.Authorize(CreateContext(httpContext)));
    }

    private static DashboardContext CreateContext(HttpContext httpContext)
    {
        // AspNetCoreDashboardContext resolves optional services (e.g. antiforgery) from RequestServices.
        httpContext.RequestServices = new ServiceCollection().BuildServiceProvider();
        return new AspNetCoreDashboardContext(new UnusedJobStorage(), new DashboardOptions(), httpContext);
    }

    /// <summary>The filter never touches storage; this only satisfies the context constructor.</summary>
    private sealed class UnusedJobStorage : JobStorage
    {
        public override IMonitoringApi GetMonitoringApi() => throw new NotSupportedException();
        public override IStorageConnection GetConnection() => throw new NotSupportedException();
    }
}
