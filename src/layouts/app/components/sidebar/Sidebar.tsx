import { useLingui } from '@lingui/react/macro'
import type { Menus } from '../../types'
import SidebarLarge from './sidebar-large/SidebarLarge'
import SidebarSmall from './sidebar-small/SidebarSmall'

const Sidebar = () => {
  const { t } = useLingui()

  const menus: Menus = [
    {
      items: [
        {
          activeIcon: 'tabler:layout-dashboard-filled',
          icon: 'tabler:layout-dashboard',
          label: t`Dashboard`,
          route: '/',
        },
        {
          activeIcon: 'material-symbols:inbox-rounded',
          icon: 'material-symbols:inbox-outline-rounded',
          label: t`Requests`,
          route: '/requests',
        },
        // {
        //   activeIcon: 'tabler:chart-pie-2-filled',
        //   icon: 'tabler:chart-pie-2',
        //   label: 'Reports',
        //   route: '/reports',
        // },
      ],
      label: t`Insights`,
    },
    {
      items: [
        // {
        //   activeIcon: 'tabler:replace-filled',
        //   icon: 'tabler:replace',
        //   label: 'Workflows',
        //   route: '/workflows',
        // },
        {
          activeIcon: 'tabler:clipboard-text-filled',
          icon: 'tabler:clipboard-text',
          label: 'Forms',
          route: '/forms',
        },
        // {
        //   activeIcon: 'tabler:folder-filled',
        //   icon: 'tabler:folder',
        //   label: 'Folders',
        //   route: '/folders',
        // },
        // {
        //   activeIcon: 'tabler:triangle-square-circle-filled',
        //   icon: 'tabler:triangle-square-circle',
        //   label: 'Tasks',
        //   route: '/tasks',
        // },
        // {
        //   activeIcon: 'tabler:template-filled',
        //   icon: 'tabler:template',
        //   label: 'Portals',
        //   route: '/portals',
        // },
      ],
      label: 'Modules',
    },
    // {
    //   items: [
    //     {
    //       activeIcon: 'tabler:settings-filled',
    //       icon: 'tabler:settings',
    //       label: 'Settings',
    //       route: '/settings',
    //     },
    //     {
    //       activeIcon: 'tabler:lifebuoy-filled',
    //       icon: 'tabler:lifebuoy',
    //       label: 'Help Center',
    //       route: '/help-center',
    //     },
    //     {
    //       activeIcon: 'tabler:trash-filled',
    //       icon: 'tabler:trash',
    //       label: 'Trash',
    //       route: '/trash',
    //     },
    //   ],
    //   label: 'Others',
    // },
  ]

  return (
    <>
      <SidebarSmall menus={menus} />
      <SidebarLarge menus={menus} />
    </>
  )
}

Sidebar.displayName = 'Sidebar'
export default Sidebar
