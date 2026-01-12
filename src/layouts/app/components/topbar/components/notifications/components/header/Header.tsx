import { useState } from 'react'
import Tab from '@/components/base/tabs/Tab'
import Tabs from '@/components/base/tabs/Tabs'
import ClearAll from './components/ClearAll'
import MarkAll from './components/MarkAll'
import Search from './components/Search'

const Header = () => {
  const [value, setValue] = useState<string | null>('Unread')

  return (
    <div className='border-b border-gray-3 pr-2 pl-3'>
      <div className='flex flex-wrap items-center py-2'>
        <div className='flex-1 font-poppins text-15 font-semibold text-gray-12'>
          Notifications
        </div>
        <Search />
        <MarkAll />
        <ClearAll />
      </div>

      <Tabs
        color='primary'
        tabClassName='h-9'
        value={value}
        onChange={setValue}
      >
        <Tab label='All' value='All' />
        <Tab label='Read' value='Read' />
        <Tab label='Unread (4)' value='Unread' />
      </Tabs>
    </div>
  )
}

Header.displayName = 'Header'
export default Header
