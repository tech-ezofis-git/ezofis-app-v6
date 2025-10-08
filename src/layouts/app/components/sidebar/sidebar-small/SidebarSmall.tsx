import Divider from '@/components/base/Divider'
import ScrollArea from '@/components/base/scroll-area/ScrollArea'
import Logo from '@/components/common/Logo'
import ThemeSwitcher from '@/components/common/ThemeSwitcher'
import type { Menus } from '../../../types'
import AuthUser from './components/AuthUser'
import MenuItem from './components/MenuItem'
import Notifications from './components/Notifications'

interface Props {
  menus: Menus
}

const SidebarSmall = ({ menus }: Props) => {
  return (
    <aside className='fixed top-0 left-0 hidden h-svh w-15 border-r border-gray-3 bg-surface-muted xl:block'>
      <div className='mb-2 flex size-15 items-center justify-center'>
        <Logo hideText />
      </div>

      <ScrollArea height='calc(100svh - 68px)'>
        <div className='flex h-full flex-col'>
          <nav>
            {menus.map((group, index) => (
              <div key={group.label}>
                {index !== 0 && (
                  <Divider className='mx-auto my-3 w-6 border-gray-3' />
                )}
                <ul className='m-0 list-none space-y-1 px-3'>
                  {group.items.map((item) => (
                    <MenuItem key={item.label} {...item} />
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <Divider className='mx-auto my-3 w-6 flex-1 border-gray-3' />

          <ul className='space-y-1 px-3'>
            <Notifications />
            <ThemeSwitcher />
          </ul>

          <Divider className='mx-auto mt-3 mb-1 w-6 border-gray-3' />

          <AuthUser />
        </div>
      </ScrollArea>
    </aside>
  )
}

SidebarSmall.displayName = 'SidebarSmall'
export default SidebarSmall
