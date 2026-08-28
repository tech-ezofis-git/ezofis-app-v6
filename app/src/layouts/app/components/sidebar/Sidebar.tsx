import { useLingui } from '@lingui/react/macro'
import authUserStore, { type SessionPermission } from '@/stores/authUserStore'
import type { Menus } from '../../types'
import SidebarLarge from './sidebar-large/SidebarLarge'
import SidebarSmall from './sidebar-small/SidebarSmall'

const normalizePermissionKey = (key: string) => {
  const k = key.toLowerCase().trim()
  if (k === 'requests') return 'request'
  if (k === 'forms') return 'form'
  if (k === 'folders') return 'folder'
  if (k === 'workflows') return 'workflow'
  return k
}

const isMenuVisible = (
  permissionKey?: string,
  sessionPermissions?: SessionPermission[] | null,
): boolean => {
  if (!permissionKey) return true
  if (!sessionPermissions || sessionPermissions.length === 0) return true

  const targetKey = normalizePermissionKey(permissionKey)
  const permission = sessionPermissions.find(
    (item) => item.key && normalizePermissionKey(item.key) === targetKey,
  )

  if (permission) {
    return permission.visible !== false
  }

  return true
}

const Sidebar = () => {
  const { t } = useLingui()

  const sessionPermissions = authUserStore(
    (state) => state.session?.permissionKeys,
  )

  const menus: Menus = [
    {
      items: [
        {
          icon: 'lucide:layout-dashboard',
          label: t`Dashboard`,
          permissionKey: 'dashboard',
          route: '/',
        },
        {
          icon: 'lucide:inbox',
          label: t`Requests`,
          permissionKey: 'request',
          route: '/requests',
        },
        {
          icon: 'lucide:folder',
          label: t`Folders`,
          permissionKey: 'folder',
          route: '/folders',
        },
      ],
      label: t`Insights`,
    },
    {
      items: [
        {
          icon: 'lucide:settings',
          label: t`Settings`,
          permissionKey: 'settings',
          route: '/settings',
        },
      ],
      label: t`Modules`,
    },
  ]

  const filteredMenu = menus
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        isMenuVisible(item.permissionKey, sessionPermissions),
      ),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <>
      <SidebarSmall menus={filteredMenu} />
      <SidebarLarge menus={filteredMenu} />
    </>
  )
}

Sidebar.displayName = 'Sidebar'
export default Sidebar

