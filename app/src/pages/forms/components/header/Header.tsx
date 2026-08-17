import { useNavigate } from '@tanstack/react-router'
import Button from '@/components/base/button/Button'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import Tab from '@/components/base/tabs/Tab'
import Tabs from '@/components/base/tabs/Tabs'
import AiBrandIcon from '@/components/common/AiBrandIcon'

interface HeaderProps {
  tabValue: string
  onTabChange: (value: string) => void
  onOpenAiBuilder?: () => void
}

const Header = ({ tabValue, onTabChange, onOpenAiBuilder }: HeaderProps) => {
  const navigate = useNavigate()

  const openFormBuilder = () => {
    navigate({ to: '/form-builder' })
  }

  return (
    <div className='flex flex-wrap items-center justify-between gap-6 border-b border-gray-3 px-6 md:px-8'>
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
        <Button
          color='primary'
          icon='lucide:plus'
          label='New Form'
          onClick={onOpenAiBuilder || openFormBuilder}
        />
      </div>
    </div>
  )
}

Header.displayName = 'Header'
export default Header
