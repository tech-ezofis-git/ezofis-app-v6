import { useLingui } from '@lingui/react/macro'
import authUserStore from '@/stores/authUserStore'
import { isPermissionVisible } from '@/utils/sessionPermissions'
import type { Menus } from '../../types'
import SidebarLarge from './sidebar-large/SidebarLarge'
import SidebarSmall from './sidebar-small/SidebarSmall'

const Sidebar = () => {
  const { t } = useLingui()

  const session = authUserStore((state) => state.session)
  const sessionPermissions = session?.permissionKeys

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
          icon: 'lucide:workflow',
          label: t`Workflows`,
          permissionKey: 'workflow-inbox',
          route: '/requests',
        },
        {
          icon: 'lucide:folder',
          label: t`Folders`,
          permissionKey: 'folder',
          route: '/folders',
        },
        {
          icon: 'lucide:file-bar-chart-2',
          label: t`Reports`,
          permissionKey: 'report',
          route: '/reports',
        },
        // {
        //   icon: 'lucide:git-branch',
        //   label: t`Workflows`,
        //   permissionKey: 'workflow',
        //   route: '/workflows',
        // },
        // {
        //   icon: 'lucide:file-text',
        //   label: t`Forms`,
        //   permissionKey: 'form',
        //   route: '/forms',
        // },
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
        isPermissionVisible(
          item.permissionKey,
          sessionPermissions,
          session?.role,
        ),
      ),
    }))
    .filter((section) => section.items.length > 0)

  console.log('[Sidebar Menu Access Data]', {
    filteredMenu,
    role: session?.role,
    sessionPermissions,
  })

  return (
    <>
      <SidebarSmall menus={filteredMenu} />
      <SidebarLarge menus={filteredMenu} />
    </>
  )
}

Sidebar.displayName = 'Sidebar'
export default Sidebar
