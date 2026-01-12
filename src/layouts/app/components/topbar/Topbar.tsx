import GlobalSearch from './components/GlobalSearch'
import Notifications from './components/notifications/Notifications'
import PageTitle from './components/PageTitle'
import SidebarToggle from './components/SidebarToggle'
import UserMenu from './components/user-menu/UserMenu'

const Topbar = () => {
  return (
    <header className='flex h-14 items-center justify-between border-b border-gray-3 pr-6 pl-4'>
      <div className='flex items-center gap-2'>
        <SidebarToggle />
        <PageTitle />
      </div>

      <div className='flex items-center'>
        <GlobalSearch />
        <Notifications />
        <UserMenu />
      </div>
    </header>
  )
}

Topbar.displayName = 'Topbar'
export default Topbar