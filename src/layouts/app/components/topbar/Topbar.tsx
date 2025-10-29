import Divider from '@/components/base/Divider'
import AskAI from './components/AskAI'
import GlobalSearch from './components/GlobalSearch'
import PageTitle from './components/PageTitle'
import SidebarToggle from './components/SidebarToggle'

const Topbar = () => {
  return (
    <header className='flex h-12 items-center justify-between border-b border-gray-3 px-6'>
      <div className='flex items-center gap-2'>
        <SidebarToggle />
        <PageTitle />
      </div>

      <div className='flex items-center gap-2'>
        <GlobalSearch />
        <Divider className='my-auto h-5' orientation='vertical' />
        <AskAI />
      </div>
    </header>
  )
}

Topbar.displayName = 'Topbar'
export default Topbar
