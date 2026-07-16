import Icon from '@/components/base/icon/Icon'
import ScrollArea from '@/components/base/scroll-area/ScrollArea'
import Tooltip from '@/components/base/Tooltip'
import Logo from '@/components/common/Logo'
import useSidebarStore from '@/layouts/app/stores/useSidebarStore'
import type { Menus } from '../../../types'
import SidebarToggle from '../SidebarToggle'
import MenuItem from './components/MenuItem'

interface Props {
  menus: Menus
}

const SidebarSmall = ({ menus }: Props) => {
  const openSidebar = useSidebarStore((state) => state.openSidebar)

  return (
    <aside className='fixed top-0 left-0 z-[60] hidden h-svh border-r border-gray-3 xl:block'>
      <div className='flex h-full w-14 flex-col justify-between pb-4'>
        <div className='flex flex-col items-center'>
          <div className='mb-2 flex size-14 items-center justify-center'>
            <Logo markClassName='size-8' hideText />
          </div>

          <ScrollArea height='calc(100dvh - 190px)'>
            <div className='flex h-full flex-col items-center'>
              <nav className='space-y-1.5'>
                {menus.map((group) => (
                  <div key={group.label}>
                    <ul className='m-0 list-none space-y-1.5 px-2.5'>
                      {group.items.map((item) => (
                        <MenuItem key={item.label} {...item} />
                      ))}
                    </ul>
                  </div>
                ))}
              </nav>
            </div>
          </ScrollArea>
        </div>

        <div className='flex flex-col items-center gap-3'>
          {/* Blinking CTA icon — click to expand sidebar & request a demo */}
          <Tooltip
            content='Automate Your Full AP Workflow — Request a Demo'
            position='right'
          >
            <button
              aria-label='Request a Demo'
              className='group relative flex size-8 items-center justify-center rounded-lg transition-all duration-200 hover:bg-gray-2 active:scale-95'
              type='button'
              onClick={openSidebar}
            >
              <Icon
                className='relative size-4 text-primary-10 group-hover:text-primary-11'
                name='lucide:sparkles'
              />
            </button>
          </Tooltip>

          <SidebarToggle tooltipPosition='right' />
        </div>
      </div>
    </aside>
  )
}

SidebarSmall.displayName = 'SidebarSmall'
export default SidebarSmall
