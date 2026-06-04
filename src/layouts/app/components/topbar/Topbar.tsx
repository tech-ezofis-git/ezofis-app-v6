import IconButton from '@/components/base/button/IconButton'
import useAskAIStore from '@/components/common/ask-ai/stores/useAskAIStore'
import GlobalSearch from './components/GlobalSearch'
import Notifications from './components/notifications/Notifications'
import PageTitle from './components/PageTitle'
import SidebarToggle from './components/SidebarToggle'
import UserMenu from './components/user-menu/UserMenu'

const Topbar = () => {
  const openAskAI = useAskAIStore((state) => state.open)
  return (
    <header className='flex h-14 items-center justify-between border-b border-gray-3 pr-6 pl-4 bg-gradient-to-b from-gray-1 to-gray-2'>
      <div className='flex items-center gap-2'>
        <SidebarToggle />
        <PageTitle />
      </div>

      <div className='flex items-center'>
        <GlobalSearch />
        <IconButton
          ariaLabel='Ask AI'
          className='text-gray-11 hover:text-gray-13'
          color='gray'
          icon='lucide:bot'
          title='Ask AI'
          variant='ghost'
          onClick={openAskAI}
        />
        <IconButton
          ariaLabel='Quick Help'
          className='text-gray-11 hover:text-gray-13'
          color='gray'
          icon='lucide:help-circle'
          title='Quick Help'
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
