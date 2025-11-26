import AskAI from './components/AskAI'
import GlobalSearch from './components/GlobalSearch'
import Notifications from './components/notifications/Notifications'
import PageTitle from './components/PageTitle'
import SidebarToggle from './components/SidebarToggle'
import UserMenu from './components/user-menu/UserMenu'

const Topbar = () => {
  return (
    <header className='flex h-13 items-center justify-between border-b border-gray-3 px-6'>
      <div className='flex items-center gap-2'>
        <SidebarToggle />
        <PageTitle />
      </div>

      <div className='flex items-center gap-2'>
        <GlobalSearch />
        <AskAI />
        <Notifications />
        <UserMenu />
      </div>
    </header>
  )
}

Topbar.displayName = 'Topbar'
export default Topbar
