import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import type { Option } from '@/types/option'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import Tab from '@/components/base/tabs/Tab'
import Tabs from '@/components/base/tabs/Tabs'

const forms = [
  {
    disabled: false,
    id: 3,
    name: 'All Forms',
  },
  {
    disabled: false,
    id: 1,
    name: 'Workflow Forms',
  },
  {
    disabled: false,
    id: 2,
    name: 'Master Forms',
  },
]

const Header = () => {
  const navigate = useNavigate()
  const [value, setValue] = useState<string | null>('All')
  const [form, setForm] = useState<Option | null>({
    disabled: false,
    id: 3,
    name: 'All Forms',
  })

  const openFormBuilder = () => {
    navigate({ params: { formId: 5 }, to: '/form-builder' })
  }

  return (
    <div className='flex flex-wrap items-center justify-between gap-6 border-b border-gray-3 px-6'>
      <Tabs color='primary' value={value} onChange={setValue}>
        <Tab label='All' value='All' />
        <Tab label='Favourites' value='Favourites' />
        <Tab label='Drafts' value='Drafts' />
      </Tabs>

      <div className='flex items-center gap-2'>
        <InputSelect
          options={forms}
          value={form}
          width={240}
          searchable
          leftSection={
            <Icon
              className='text-gray-10'
              name='material-symbols:assignment-outline-rounded'
            />
          }
          onChange={setForm}
        />
        <Button icon='lucide:plus' label='New Form' onClick={openFormBuilder} />
      </div>
    </div>
  )
}

Header.displayName = 'Header'
export default Header
