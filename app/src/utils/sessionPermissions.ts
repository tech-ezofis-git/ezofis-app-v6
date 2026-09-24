import type { SessionPermission } from '@/stores/authUserStore'

const PERMISSION_KEY_ALIASES: Record<string, string> = {
  'folder-configuration': 'folder-create',
  'folder-creation': 'folder-create',
  folders: 'folder',
  forms: 'form',
  portals: 'portal',
  report: 'report',
  'report-builder': 'report-builder',
  'report-builder-settings': 'report-builder',
  reportbuilder: 'report-builder',
  reports: 'report',
  requests: 'workflow-inbox',
  request: 'workflow-inbox',
  'workflow-inbox': 'workflow-inbox',
  workflowinbox: 'workflow-inbox',
  workflows: 'workflow',
  workflow: 'workflow',
}

export const normalizePermissionKey = (key: string) => {
  const slug = key
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^\w]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return PERMISSION_KEY_ALIASES[slug] || slug
}

export const isPermissionFlagVisible = (value: unknown): boolean => {
  // Key present with no explicit flag means granted.
  if (value == null || value === '') return true
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  const text = String(value).trim().toLowerCase()
  if (!text) return true
  return text === 'true' || text === '1' || text === 'yes'
}

const permissionIdentity = (item: SessionPermission | string): string[] => {
  if (typeof item === 'string') return [item]
  if (!item || typeof item !== 'object') return []
  return [
    item.key,
    item.menu,
    item.name,
    (item as Record<string, unknown>).permissionKey,
    (item as Record<string, unknown>).permission,
    (item as Record<string, unknown>).id,
    (item as Record<string, unknown>).code,
  ].filter(
    (value): value is string =>
      typeof value === 'string' && Boolean(value.trim()),
  )
}

export const isPermissionVisible = (
  permissionKey?: string,
  sessionPermissions?: Array<SessionPermission | string> | null,
  role?: string | null,
): boolean => {
  if (!permissionKey) return true

  const normalizedRole = String(role || '').trim().toLowerCase()
  const isAdmin =
    normalizedRole === 'admin' ||
    normalizedRole === 'administrator' ||
    normalizedRole === 'superadmin'

  if (!sessionPermissions || sessionPermissions.length === 0) return true

  const targetKey = normalizePermissionKey(permissionKey)
  const matchingPermissions = sessionPermissions.filter((item) =>
    permissionIdentity(item).some(
      (value) => normalizePermissionKey(value) === targetKey,
    ),
  )

  if (matchingPermissions.length === 0) {
    if (isAdmin) return true
    return false
  }

  return matchingPermissions.some((item) =>
    isPermissionFlagVisible(
      typeof item === 'string' ? true : item.visible,
    ),
  )
}

export const isAnyPermissionVisible = (
  permissionKeys: string[],
  sessionPermissions?: Array<SessionPermission | string> | null,
  role?: string | null,
): boolean => {
  if (!permissionKeys.length) return true
  return permissionKeys.some((key) =>
    isPermissionVisible(key, sessionPermissions, role),
  )
}
