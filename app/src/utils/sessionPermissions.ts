import type { SessionPermission } from '@/stores/authUserStore'

const PERMISSION_KEY_ALIASES: Record<string, string> = {
  'folder-configuration': 'folder-create',
  'folder-creation': 'folder-create',
  folders: 'folder',
  forms: 'form',
  portals: 'portal',
  requests: 'request',
  workflows: 'workflow',
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

const permissionIdentity = (item: SessionPermission) =>
  [item.key, item.menu, item.name].filter(
    (value): value is string =>
      typeof value === 'string' && Boolean(value.trim()),
  )

export const isPermissionVisible = (
  permissionKey?: string,
  sessionPermissions?: SessionPermission[] | null,
): boolean => {
  if (!permissionKey) return true
  if (!sessionPermissions || sessionPermissions.length === 0) return true

  const targetKey = normalizePermissionKey(permissionKey)
  const permission = sessionPermissions.find((item) =>
    permissionIdentity(item).some(
      (value) => normalizePermissionKey(value) === targetKey,
    ),
  )

  if (!permission) return false

  return isPermissionFlagVisible(permission.visible)
}

export const isAnyPermissionVisible = (
  permissionKeys: string[],
  sessionPermissions?: SessionPermission[] | null,
): boolean => {
  if (!permissionKeys.length) return true
  return permissionKeys.some((key) =>
    isPermissionVisible(key, sessionPermissions),
  )
}
