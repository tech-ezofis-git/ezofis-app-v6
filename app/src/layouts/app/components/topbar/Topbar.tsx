import { useLingui } from '@lingui/react/macro'
import { useLocation } from '@tanstack/react-router'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import useAskAIStore from '@/components/common/ask-ai/stores/useAskAIStore'
import useSettingsTopbarStore from '@/pages/settings/stores/useSettingsTopbarStore'
import usePlaygroundStore from '@/stores/usePlaygroundStore'
import SidebarToggle from '../sidebar/SidebarToggle'
import GlobalSearch from './components/GlobalSearch'
import Notifications from './components/notifications/Notifications'
import PageTitle from './components/PageTitle'
import UserMenu from './components/user-menu/UserMenu'

const Topbar = () => {
  const { t } = useLingui()
  const { pathname } = useLocation()
  const openAskAI = useAskAIStore((state) => state.open)
  const isAskAIOpen = useAskAIStore((state) => state.isOpen)
  const isAskAIMaximized = useAskAIStore((state) => state.isMaximized)
  const isPlaygroundOpen = usePlaygroundStore((state) => state.isOpen)
  const openPlayground = usePlaygroundStore((state) => state.open)
  const closePlayground = usePlaygroundStore((state) => state.close)
  const topbarAction = useSettingsTopbarStore((state) => state.action)

  const handleOpenAskAI = () => {
    // Read from store directly so HMR / stale closures can't block open.
    useAskAIStore.getState().open()
  }

  const isSearchPage = pathname.startsWith('/search')

  return (
    <header className='relative z-[20000] flex h-14 items-center justify-between border-b border-gray-3 bg-gradient-to-b from-gray-1 to-gray-2 px-4'>
      <div className='flex items-center gap-2'>
        <div className='flex items-center xl:hidden'>
          <SidebarToggle />
        </div>
        {!isAskAIMaximized && <PageTitle />}
      </div>

      <div className='flex items-center'>
        {!isSearchPage && <GlobalSearch />}
        <IconButton
          ariaLabel={t`Ask AI`}
          color='gray'
          icon='lucide:bot'
          tooltip={t`Ask AI`}
          variant='ghost'
          className={
            isAskAIOpen
              ? 'text-primary-11 hover:text-primary-12'
              : 'text-gray-11 hover:text-gray-13'
          }
          onClick={handleOpenAskAI}
        />
        <IconButton
          ariaLabel={t`Quick Help`}
          className='text-gray-11 hover:text-gray-13'
          color='gray'
          icon='lucide:help-circle'
          tooltip={t`Quick Help`}
          variant='ghost'
          onClick={() =>
            globalThis.open('https://help.ezofis.com/', '_blank', 'noopener')
          }
        />
        <IconButton
          ariaLabel={t`API Playground`}
          color='gray'
          icon='tabler:plug-connected'
          tooltip={t`API Playground`}
          variant='ghost'
          className={
            isPlaygroundOpen
              ? 'text-primary-11 hover:text-primary-12'
              : 'text-gray-11 hover:text-gray-13'
          }
          onClick={() =>
            isPlaygroundOpen ? closePlayground() : openPlayground()
          }
        />
        <Notifications />
        {topbarAction ? (
          <Button
            className='ml-2'
            color={topbarAction.color ?? 'primary'}
            icon={topbarAction.icon}
            label={topbarAction.label}
            size='sm'
            variant='solid'
            onClick={topbarAction.onClick}
          />
        ) : null}
        <UserMenu />
      </div>
    </header>
  )
}

Topbar.displayName = 'Topbar'
export default Topbar
