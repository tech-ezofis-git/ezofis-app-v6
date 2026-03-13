import { useState } from 'react'
import type { Option } from '@/types/option'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import Tab from '@/components/base/tabs/Tab'
import Tabs from '@/components/base/tabs/Tabs'

const workflows = [
  {
    disabled: false,
    id: 3,
    name: 'All Workflows',
  },
  {
    disabled: false,
    id: 1,
    name: 'Published',
  },
  {
    disabled: false,
    id: 2,
    name: 'Drafts',
  },
]

interface HeaderProps {
  onCreate: () => void
}

const Header = ({ onCreate }: HeaderProps) => {
  const [value, setValue] = useState<string | null>('All')
  const [workflow, setWorkflow] = useState<Option | null>({
    disabled: false,
    id: 3,
    name: 'All Workflows',
  })

  return (
    <div className='flex flex-wrap items-center justify-between gap-6 border-b border-gray-3 px-6'>
      <Tabs color='primary' value={value} onChange={setValue}>
        <Tab label='All' value='All' />
        <Tab label='Favourites' value='Favourites' />
        <Tab label='Drafts' value='Drafts' />
      </Tabs>

      <div className='flex items-center gap-2'>
        <InputSelect
          options={workflows}
          value={workflow}
          width={240}
          searchable
          leftSection={
            <Icon
              className='text-gray-10'
              name='material-symbols:assignment-outline-rounded'
            />
          }
          onChange={setWorkflow}
        />
        <Button icon='lucide:plus' label='New Workflow' onClick={onCreate} />
      </div>
    </div>
  )
}

Header.displayName = 'Header'
export default Header
