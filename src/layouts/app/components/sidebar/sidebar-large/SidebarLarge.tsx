import type { Menus } from '@/layouts/app/types'
import IconButton from '@/components/base/button/IconButton'
import Drawer from '@/components/base/Drawer'
import ScrollArea from '@/components/base/scroll-area/ScrollArea'
import Logo from '@/components/common/Logo'
import sidebarStore from '@/layouts/app/store/sidebarStore'
import MenuItem from './components/MenuItem'

interface Props {
  menus: Menus
}

const SidebarLarge = ({ menus }: Props) => {
  const isSidebarOpen = sidebarStore((state) => state.isSidebarOpen)
  const closeSidebar = sidebarStore((state) => state.closeSidebar)

  return (
    <Drawer
      offset={0}
      opened={isSidebarOpen}
      position='left'
      width={260}
      onClose={closeSidebar}
    >
      <div className='mb-3 flex h-15 items-center justify-between px-3'>
        <Logo />
        <IconButton
          color='gray'
          icon='tabler:layout-sidebar-left-collapse'
          variant='ghost'
          onClick={closeSidebar}
        />
      </div>

      <ScrollArea height='calc(100svh - 72px)'>
        <div className='flex h-full flex-col'>
          <nav className='space-y-4 px-3'>
            {menus.map((group) => (
              <div key={group.label}>
                <div className='flex h-6 items-center px-2 py-0 text-12 text-gray-10'>
                  {group.label}
                </div>
                <ul className='m-0 list-none space-y-1 p-0'>
                  {group.items.map((item) => (
                    <MenuItem
                      key={item.label}
                      {...item}
                      onClick={closeSidebar}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </ScrollArea>
    </Drawer>
  )
}

SidebarLarge.displayName = 'SidebarLarge'
export default SidebarLarge
