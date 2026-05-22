import IconButton from '@/components/base/button/IconButton'
import useAskAIStore from '@/components/common/ask-ai/stores/useAskAIStore'
import GlobalSearch from './components/GlobalSearch'
import Notifications from './components/notifications/Notifications'
import PageTitle from './components/PageTitle'
import QuickHelp from './components/quick-help/QuickHelp'
import SidebarToggle from './components/SidebarToggle'
import UserMenu from './components/user-menu/UserMenu'

const Topbar = () => {
  const openAskAI = useAskAIStore((state) => state.open)
  return (
    <header className='flex h-14 items-center justify-between border-b border-gray-3 pr-6 pl-4'>
      <div className='flex items-center gap-2'>
        <SidebarToggle />
        <PageTitle />
      </div>

      <div className='flex items-center'>
        <GlobalSearch />
        <IconButton
          className='text-gray-11 hover:text-gray-13'
          color='gray'
          icon='mingcute:magic-1-line'
          variant='ghost'
          onClick={openAskAI}
        />
        <QuickHelp />
        <Notifications />
        <UserMenu />
      </div>
    </header>
  )
}

Topbar.displayName = 'Topbar'
export default Topbar
