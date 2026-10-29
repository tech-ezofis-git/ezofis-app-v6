using Microsoft.EntityFrameworkCore;
using SaaSApp.Users.Application.Contracts;
using SaaSApp.Users.Domain;
using SaaSApp.Users.Domain.Entities;

namespace SaaSApp.Users.Infrastructure.Persistence;

public sealed class BuiltinRoleProvisioning : IBuiltinRoleProvisioning
{
    /// <summary>
    /// Categories only TenantAdmin/Admin get by default. The builtin TenantUser role never has them
    /// (removed if present), so e.g. the Settings menu is hidden from ordinary users. Admins can
    /// still grant them to specific users through a custom role.
    /// </summary>
    private static readonly HashSet<string> AdminOnlyCategoryKeys = new(StringComparer.OrdinalIgnoreCase)
    {
        "settings"
    };

    private readonly UsersDbContext _context;
    private readonly ITenantContext _tenantContext;

    public BuiltinRoleProvisioning(UsersDbContext context, ITenantContext tenantContext)
    {
        _context = context;
        _tenantContext = tenantContext;
    }

    public async Task EnsureBuiltinRolesAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId
            ?? throw new InvalidOperationException("TenantId is required to ensure builtin roles.");

        await EnsureCoreAsync(_context, tenantId, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task SyncUserMembershipAsync(Guid userId, string? roleName, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId
            ?? throw new InvalidOperationException("TenantId is required to sync builtin role membership.");

        var roles = await EnsureRolesExistAsync(_context, tenantId, cancellationToken);
        await SyncOneUserAsync(_context, tenantId, userId, roleName, roles, cancellationToken);
    }

    /// <summary>Ensures builtin roles/permissions/membership for a tenant using an explicit DbContext (signup / middleware).</summary>
    public static async Task EnsureAsync(
        UsersDbContext context,
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        await EnsureCoreAsync(context, tenantId, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
    }

    private static async Task EnsureCoreAsync(
        UsersDbContext context,
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var roles = await EnsureRolesExistAsync(context, tenantId, cancellationToken);
        await UsersSchemaEnsurer.EnsureRoleMenusTablesAsync(context, cancellationToken);
        await EnsureRoleMenusAsync(context, tenantId, roles.TenantAdmin.Id, cancellationToken);
        await EnsureRoleMenusAsync(context, tenantId, roles.Admin.Id, cancellationToken);
        await EnsureRoleMenusAsync(context, tenantId, roles.TenantUser.Id, cancellationToken);
        await SyncAllMembershipsAsync(context, tenantId, roles, cancellationToken);
    }

    private sealed record BuiltinRoles(Role TenantAdmin, Role Admin, Role TenantUser)
    {
        public IEnumerable<Guid> Ids => [TenantAdmin.Id, Admin.Id, TenantUser.Id];
    }

    private static async Task<BuiltinRoles> EnsureRolesExistAsync(
        UsersDbContext context,
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var tenantAdminRole = await GetOrCreateBuiltinRoleAsync(
            context,
            tenantId,
            User.RoleTenantAdmin,
            "Tenant owner. Full access, including TenantAdmin-only repositories.",
            cancellationToken);
        var adminRole = await GetOrCreateBuiltinRoleAsync(
            context,
            tenantId,
            User.RoleAdmin,
            "Full system administrator.",
            cancellationToken);
        var tenantUserRole = await GetOrCreateBuiltinRoleAsync(
            context,
            tenantId,
            User.RoleTenantUser,
            "Standard tenant user.",
            cancellationToken,
            excludedKeys: AdminOnlyCategoryKeys);
        return new BuiltinRoles(tenantAdminRole, adminRole, tenantUserRole);
    }

    private static async Task<Role> GetOrCreateBuiltinRoleAsync(
        UsersDbContext context,
        Guid tenantId,
        string roleName,
        string description,
        CancellationToken cancellationToken,
        IReadOnlySet<string>? excludedKeys = null)
    {
        var categoryKeys = await context.PermissionCategories
            .AsNoTracking()
            .Where(c => c.IsActive)
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Key)
            .Select(c => c.Key)
            .ToListAsync(cancellationToken);

        // Always include folder, settings (configuration), and the other sidebar categories
        // even if the catalog query is empty on a brand-new tenant.
        foreach (var (_, key, _, _) in PermissionCategoryDefaults.All)
        {
            if (!categoryKeys.Contains(key, StringComparer.OrdinalIgnoreCase))
                categoryKeys.Add(key);
        }

        if (excludedKeys is { Count: > 0 })
            categoryKeys.RemoveAll(excludedKeys.Contains);

        var existing = await context.Roles
            .Include(r => r.Permissions)
            .FirstOrDefaultAsync(r => r.Name == roleName, cancellationToken);

        if (existing != null)
        {
            // Backfill: builtin roles were only granted categories present at first create.
            // New categories (or empty create) left some options as Visible:false in the UI.
            EnsureAllCategoryPermissions(existing, categoryKeys);
            RemoveExcludedPermissions(existing, excludedKeys);
            return existing;
        }

        var role = Role.Create(tenantId, roleName, description);
        if (categoryKeys.Count > 0)
            role.AssignPermissions(categoryKeys);

        await context.Roles.AddAsync(role, cancellationToken);
        return role;
    }

    /// <summary>Grant any missing active permission categories onto a builtin role (does not remove existing).</summary>
    private static void EnsureAllCategoryPermissions(Role role, IReadOnlyList<string> categoryKeys)
    {
        if (categoryKeys.Count == 0)
            return;

        var existing = new HashSet<string>(
            role.Permissions.Select(p => p.PermissionKey),
            StringComparer.OrdinalIgnoreCase);
        var missing = categoryKeys.Where(k => !existing.Contains(k)).ToList();
        if (missing.Count > 0)
            role.AssignPermissions(missing);
    }

    /// <summary>Drop admin-only categories a builtin role was granted earlier (e.g. settings on TenantUser).</summary>
    private static void RemoveExcludedPermissions(Role role, IReadOnlySet<string>? excludedKeys)
    {
        if (excludedKeys is { Count: > 0 })
            role.RemovePermissions(excludedKeys);
    }

    /// <summary>
    /// Link every sidebar menu onto the builtin role. Dashboard is the default landing page
    /// when the role has none yet. Does not remove menus an admin already customized.
    /// </summary>
    private static async Task EnsureRoleMenusAsync(
        UsersDbContext context,
        Guid tenantId,
        Guid roleId,
        CancellationToken cancellationToken)
    {
        var menus = await context.Menus
            .AsNoTracking()
            .OrderBy(m => m.SortOrder)
            .ThenBy(m => m.Key)
            .Select(m => new { m.Id, m.Key })
            .ToListAsync(cancellationToken);

        if (menus.Count == 0)
            return;

        var existing = await context.RoleMenus
            .Where(rm => rm.RoleId == roleId)
            .Select(rm => new { rm.MenuId, rm.IsDefaultLanding })
            .ToListAsync(cancellationToken);

        var existingIds = existing.Select(rm => rm.MenuId).ToHashSet();
        var hasDefault = existing.Any(rm => rm.IsDefaultLanding);

        foreach (var menu in menus)
        {
            if (!existingIds.Add(menu.Id))
                continue;

            var isDefault = !hasDefault
                && string.Equals(menu.Key, "dashboard", StringComparison.OrdinalIgnoreCase);
            if (isDefault)
                hasDefault = true;

            await context.RoleMenus.AddAsync(
                RoleMenu.Create(tenantId, roleId, menu.Id, isDefault),
                cancellationToken);
        }
    }

    /// <summary>Builtin role a user's Users.Role maps to (TenantAdmin, Admin, TenantUser), or null for custom roles.</summary>
    private static Guid? BuiltinRoleIdFor(string? roleName, BuiltinRoles roles)
    {
        var trimmed = roleName?.Trim();
        if (string.Equals(trimmed, User.RoleTenantAdmin, StringComparison.OrdinalIgnoreCase))
            return roles.TenantAdmin.Id;
        if (string.Equals(trimmed, User.RoleAdmin, StringComparison.OrdinalIgnoreCase))
            return roles.Admin.Id;
        if (string.Equals(trimmed, User.RoleTenantUser, StringComparison.OrdinalIgnoreCase))
            return roles.TenantUser.Id;
        return null;
    }

    private static async Task SyncAllMembershipsAsync(
        UsersDbContext context,
        Guid tenantId,
        BuiltinRoles roles,
        CancellationToken cancellationToken)
    {
        var users = await context.Users
            .AsNoTracking()
            .Where(u => u.Role == User.RoleTenantAdmin || u.Role == User.RoleAdmin || u.Role == User.RoleTenantUser)
            .Select(u => new { u.Id, u.Role })
            .ToListAsync(cancellationToken);

        // Each user belongs to exactly the builtin role matching Users.Role
        // (TenantAdmin users -> TenantAdmin role, no longer the Admin role).
        var wanted = users
            .Select(u => (RoleId: BuiltinRoleIdFor(u.Role, roles)!.Value, UserId: u.Id))
            .ToHashSet();

        var builtinIds = roles.Ids.ToList();
        var existing = await context.UserRoles
            .Where(ur => builtinIds.Contains(ur.RoleId))
            .ToListAsync(cancellationToken);

        foreach (var ur in existing)
        {
            if (!wanted.Contains((ur.RoleId, ur.UserId)))
                context.UserRoles.Remove(ur);
        }

        var existingPairs = existing
            .Select(ur => (ur.RoleId, ur.UserId))
            .ToHashSet();

        foreach (var (roleId, userId) in wanted)
        {
            if (existingPairs.Add((roleId, userId)))
                await context.UserRoles.AddAsync(UserRole.Create(tenantId, roleId, userId), cancellationToken);
        }
    }

    private static async Task SyncOneUserAsync(
        UsersDbContext context,
        Guid tenantId,
        Guid userId,
        string? roleName,
        BuiltinRoles roles,
        CancellationToken cancellationToken)
    {
        var wantedRoleId = BuiltinRoleIdFor(roleName, roles);
        var builtinIds = roles.Ids.ToList();

        var memberships = await context.UserRoles
            .Where(ur => ur.UserId == userId && builtinIds.Contains(ur.RoleId))
            .ToListAsync(cancellationToken);

        foreach (var ur in memberships)
        {
            if (ur.RoleId != wantedRoleId)
                context.UserRoles.Remove(ur);
        }

        if (wantedRoleId is Guid roleId && memberships.All(ur => ur.RoleId != roleId))
            await context.UserRoles.AddAsync(UserRole.Create(tenantId, roleId, userId), cancellationToken);
    }
}
