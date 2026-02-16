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
          icon: 'lucide:layout-dashboard',
          label: t`Dashboard`,
          route: '/',
        },
        {
          icon: 'lucide:inbox',
          label: t`Requests`,
          route: '/requests',
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
          label: 'Workflows',
          route: '/workflows',
        },
        {
          icon: 'lucide:clipboard-list',
          label: 'Forms',
          route: '/forms',
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
      label: 'Modules',
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

  return (
    <>
      <SidebarSmall menus={menus} />
      <SidebarLarge menus={menus} />
    </>
  )
}

Sidebar.displayName = 'Sidebar'
export default Sidebar
