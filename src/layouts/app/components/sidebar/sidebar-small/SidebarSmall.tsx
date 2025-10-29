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
    <aside className='fixed top-0 left-0 z-5 hidden h-svh border-r border-gray-3 bg-surface-muted xl:block'>
      <div className='w-13'>
        <div className='mb-2 flex h-12 w-13 items-center justify-center'>
          <Logo markClassName='size-7.5' hideText />
        </div>

        <ScrollArea height='calc(100svh - 56px)'>
          <div className='flex h-full flex-col items-center'>
            <nav>
              {menus.map((group, index) => (
                <div key={group.label}>
                  {index !== 0 && (
                    <Divider className='mx-auto my-3 w-6 border-gray-4' />
                  )}
                  <ul className='m-0 list-none space-y-1 px-2.5'>
                    {group.items.map((item) => (
                      <MenuItem key={item.label} {...item} />
                    ))}
                  </ul>
                </div>
              ))}
            </nav>

            <Divider className='mx-auto my-3 w-6 flex-1 border-gray-4' />

            <ul className='space-y-1 px-2.5'>
              <Notifications />
              <ThemeSwitcher />
            </ul>

            <Divider className='mx-auto mt-3 mb-1 w-6 border-gray-4' />

            <AuthUser />
          </div>
        </ScrollArea>
      </div>
    </aside>
  )
}

SidebarSmall.displayName = 'SidebarSmall'
export default SidebarSmall
