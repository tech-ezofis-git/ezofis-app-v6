import { useLingui } from '@lingui/react/macro'
import authUserStore from '@/stores/authUserStore'
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
          label: t`Requests`,
          permissionKey: 'requests',
          route: '/requests',
        },
        {
          icon: 'lucide:folder',
          label: t`Folders`,
          permissionKey: 'folder',
          route: '/folders',
        },
        // {
        //   icon: 'lucide:chart-pie',
        //   label: 'Reports',
        //   route: '/reports',
        // },
      ],
      label: t`Insights`,
    },
    {
      items: [
        {
          icon: 'lucide:workflow',
          label: t`Workflows`,
          permissionKey: 'workflow',
          route: '/workflows',
        },
        {
          icon: 'lucide:clipboard-list',
          label: t`Forms`,
          permissionKey: 'forms',
          route: '/forms',
        },
        {
          icon: 'lucide:settings',
          label: t`Settings`,
          permissionKey: 'settings',
          route: '/settings',
        },
        // {
        //   icon: 'lucide:folder',
        //   label: 'Folders',
        //   route: '/folders',
        // },
        // {
        //   icon: 'lucide:blocks',
        //   label: 'Tasks',
        //   route: '/tasks',
        // },
        // {
        //   icon: 'lucide:panels-top-left',
        //   label: 'Portals',
        //   route: '/portals',
        // },
      ],
      label: t`Modules`,
    },
    // {
    //   items: [
    //     {
    //       icon: 'lucide:settings',
    //       label: 'Settings',
    //       route: '/settings',
    //     },
    //     {
    //       icon: 'lucide:life-buoy',
    //       label: 'Help Center',
    //       route: '/help-center',
    //     },
    //     {
    //       icon: 'lucide:trash-2',
    //       label: 'Trash',
    //       route: '/trash',
    //     },
    //   ],
    //   label: 'Others',
    // },
  ]

  const permissionMap = new Map<string, boolean>(
    (sessionPermissions || []).map((item) => [
      item.key ?? '',
      item.visible === true,
    ]),
  )

  // TEMP: always show Requests/Forms until role permission persistence is fixed
  const temporarilyAlwaysVisible = new Set(['requests', 'forms'])

  const filteredMenu =
    !sessionPermissions || sessionPermissions.length === 0
      ? menus
      : menus
          .map((section) => ({
            ...section,
            items: section.items.filter(
              (item) =>
                !item.permissionKey ||
                temporarilyAlwaysVisible.has(item.permissionKey) ||
                permissionMap.get(item.permissionKey) === true,
            ),
          }))
          .filter((section) => section.items.length > 0)

  // console.log(filteredMenu)

  return (
    <>
      <SidebarSmall menus={filteredMenu} />
      <SidebarLarge menus={filteredMenu} />
    </>
  )
}

Sidebar.displayName = 'Sidebar'
export default Sidebar
