import { useLingui } from '@lingui/react/macro'
import Tab from '@/components/base/tabs/Tab'
import Tabs from '@/components/base/tabs/Tabs'
import ClearAll from './components/ClearAll'
import MarkAll from './components/MarkAll'
import Search from './components/Search'

interface Props {
  activeTab: string
  searchQuery: string
  unreadCount: number
  onClearAll: () => void
  onMarkAllRead: () => void
  onSearchChange: (query: string) => void
  onTabChange: (tab: string) => void
}

const Header = ({
  activeTab,
  searchQuery,
  unreadCount,
  onClearAll,
  onMarkAllRead,
  onSearchChange,
  onTabChange,
}: Props) => {
  const { t } = useLingui()

  return (
    <div className='border-b border-gray-3 pr-2 pl-3'>
      <div className='flex flex-wrap items-center py-2'>
        <div className='flex-1 font-poppins text-15 font-semibold text-gray-12'>
          {t`Notifications`}
        </div>
        <Search query={searchQuery} onChange={onSearchChange} />
        <MarkAll onClick={onMarkAllRead} />
        <ClearAll onClick={onClearAll} />
      </div>

      <Tabs
        color='primary'
        tabClassName='h-9'
        value={activeTab}
        onChange={(val) => val && onTabChange(val)}
      >
        <Tab label={t`All`} value='All' />
        <Tab label={t`Read`} value='Read' />
        <Tab label={t`Unread (${unreadCount})`} value='Unread' />
      </Tabs>
    </div>
  )
}

Header.displayName = 'Header'
export default Header
