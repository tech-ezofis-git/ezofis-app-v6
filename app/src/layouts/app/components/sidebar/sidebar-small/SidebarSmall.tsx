import { useLingui } from '@lingui/react/macro'
import Icon from '@/components/base/icon/Icon'
import ScrollArea from '@/components/base/scroll-area/ScrollArea'
import Tooltip from '@/components/base/Tooltip'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import Logo from '@/components/common/Logo'
import useRequestDemoStore from '@/layouts/app/stores/useRequestDemoStore'
import cn from '@/utils/cn'
import type { Menus } from '../../../types'
import SidebarToggle from '../SidebarToggle'
import MenuItem from './components/MenuItem'

interface Props {
  menus: Menus
}

const SidebarSmall = ({ menus }: Props) => {
  const { t } = useLingui()
  const isDemoFormOpen = useRequestDemoStore((s) => s.isDemoFormOpen)
  const openDemoForm = useRequestDemoStore((s) => s.openDemoForm)

  return (
    <aside className='fixed top-0 left-0 z-[60] hidden h-svh border-r border-gray-3 xl:block'>
      <div className='flex h-full w-14 flex-col justify-between pb-4'>
        <div className='flex flex-col items-center'>
          <div className='mb-2 flex size-14 items-center justify-center'>
            <Logo markClassName='size-10' hideText />
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
          {/* Request a Demo — highlighted while demo form is open */}
          <Tooltip
            content={t`Automate Your Full AP Workflow — Request a Demo`}
            position='right'
          >
            <button
              aria-current={isDemoFormOpen ? 'page' : undefined}
              aria-label={t`Request a Demo`}
              type='button'
              className={cn(
                'group relative flex size-8 items-center justify-center rounded-lg transition-all duration-200 hover:bg-gray-2 active:scale-95',
                isDemoFormOpen && 'bg-gray-3',
              )}
              onClick={openDemoForm}
            >
              <AiBrandIcon
                className='relative size-4'
                variant='outline-purple'
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
