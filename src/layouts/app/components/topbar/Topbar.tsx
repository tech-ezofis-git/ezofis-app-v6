import { useLingui } from '@lingui/react/macro'
import IconButton from '@/components/base/button/IconButton'
import useAskAIStore from '@/components/common/ask-ai/stores/useAskAIStore'
import SidebarToggle from '../sidebar/SidebarToggle'
import GlobalSearch from './components/GlobalSearch'
import Notifications from './components/notifications/Notifications'
import PageTitle from './components/PageTitle'
import UserMenu from './components/user-menu/UserMenu'

const Topbar = () => {
  const { t } = useLingui()
  const openAskAI = useAskAIStore((state) => state.open)
  const isAskAIOpen = useAskAIStore((state) => state.isOpen)

  const handleOpenAskAI = () => {
    // Read from store directly so HMR / stale closures can't block open.
    useAskAIStore.getState().open()
  }

  return (
    <header className='flex h-14 items-center justify-between border-b border-gray-3 bg-gradient-to-b from-gray-1 to-gray-2 pr-6 pl-4'>
      <div className='flex items-center gap-2'>
        <div className='flex items-center xl:hidden'>
          <SidebarToggle />
        </div>
        <PageTitle />
      </div>

      <div className='flex items-center'>
        <GlobalSearch />
        <IconButton
          ariaLabel={t`Ask AI`}
          className={
            isAskAIOpen
              ? 'text-primary-11 hover:text-primary-12'
              : 'text-gray-11 hover:text-gray-13'
          }
          color='gray'
          icon='lucide:bot'
          tooltip={t`Ask AI`}
          variant='ghost'
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
        <Notifications />
        <UserMenu />
      </div>
    </header>
  )
}

Topbar.displayName = 'Topbar'
export default Topbar
