import Button from '@/components/base/button/Button'
import Tab from '@/components/base/tabs/Tab'
import Tabs from '@/components/base/tabs/Tabs'

interface HeaderProps {
  tabValue: string
  onCreate: () => void
  onTabChange: (value: string) => void
}

const Header = ({ tabValue, onCreate, onTabChange }: HeaderProps) => {
  return (
    <div className='flex flex-wrap items-center justify-between gap-6 border-b border-gray-3 px-6'>
      <Tabs
        color='primary'
        value={tabValue}
        onChange={(val) => onTabChange(val || 'All')}
      >
        <Tab label='All' value='All' />
        <Tab label='Published' value='Published' />
        <Tab label='Drafts' value='Drafts' />
      </Tabs>

      <div className='flex items-center gap-2'>
        <Button icon='lucide:plus' label='New Workflow' onClick={onCreate} />
      </div>
    </div>
  )
}

Header.displayName = 'Header'
export default Header
