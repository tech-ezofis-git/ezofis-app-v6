import { useLingui } from '@lingui/react/macro'
import authUserStore from '@/stores/authUserStore'
import { isPermissionVisible } from '@/utils/sessionPermissions'
import type { Menus } from '../../types'
import SidebarLarge from './sidebar-large/SidebarLarge'
import SidebarSmall from './sidebar-small/SidebarSmall'

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
          label: t`Workflows`,
          permissionKey: 'request',
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
        isPermissionVisible(item.permissionKey, sessionPermissions),
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
