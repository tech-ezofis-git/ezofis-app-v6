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
    name: 'Accounts Payable',
  },
  {
    disabled: false,
    id: 2,
    name: 'Employee On-boarding',
  },
]

const Header = () => {
  const [value, setValue] = useState<string | null>('Inbox')
  const [workflow, setWorkflow] = useState<Option | null>({
    disabled: false,
    id: 1,
    name: 'Accounts Payable',
  })

  return (
    <div className='flex flex-wrap items-center justify-between gap-6 border-b border-gray-3 px-6 md:px-8'>
      <Tabs color='primary' value={value} onChange={setValue}>
        <Tab label='Inbox (4)' value='Inbox' />
        <Tab label='Sent' value='Sent' />
        <Tab label='Closed' value='Closed' />
      </Tabs>

      <div className='flex items-center gap-2'>
        <InputSelect
          leftSection={<Icon className='text-gray-10' name='tabler:replace' />}
          options={workflows}
          size='sm'
          value={workflow}
          width={240}
          searchable
          onChange={setWorkflow}
        />
        <Button icon='tabler:plus' label='New Request' />
      </div>
    </div>
  )
}

Header.displayName = 'Header'
export default Header
