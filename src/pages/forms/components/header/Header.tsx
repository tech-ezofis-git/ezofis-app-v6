import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import type { Option } from '@/types/option'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import Tab from '@/components/base/tabs/Tab'
import Tabs from '@/components/base/tabs/Tabs'
import cn from '@/utils/cn'

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

interface Props {
  viewMode: 'table' | 'grid'
  setViewMode: (mode: 'table' | 'grid') => void
}

const Header = ({ viewMode, setViewMode }: Props) => {
  console.log('Header Render - viewMode:', viewMode)
  const navigate = useNavigate()
  const [value, setValue] = useState<string | null>('All')
  const [form, setForm] = useState<Option | null>({
    disabled: false,
    id: 3,
    name: 'All Forms',
  })

  const openFormBuilder = () => {
    navigate({ to: '/form-builder' })
  }

  return (
    <div className='flex flex-wrap items-center justify-between gap-6 border-b border-gray-3 px-6 md:px-8'>
      <Tabs color='primary' value={value} onChange={setValue}>
        <Tab label='All' value='All' />
        <Tab label='Favourites' value='Favourites' />
        <Tab label='Drafts' value='Drafts' />
      </Tabs>
      
      <div className='flex items-center gap-2'>
        <div className='flex items-center gap-1 rounded-lg border border-gray-3 bg-gray-50/50 p-1'>
          <button
            type='button'
            className={cn(
              'flex cursor-pointer items-center justify-center rounded-md px-3 py-1.5 transition-all duration-200',
              viewMode === 'grid'
                ? 'bg-accent-primary text-white shadow-sm'
                : 'text-gray-10 hover:bg-gray-2 hover:text-gray-12',
            )}
            onClick={() => {
              console.log('Toggle Clicked: grid')
              setViewMode('grid')
            }}
          >
            <Icon className='size-4' name='tabler:layout-grid' />
          </button>
          <button
            type='button'
            className={cn(
              'flex cursor-pointer items-center justify-center rounded-md px-3 py-1.5 transition-all duration-200',
              viewMode === 'table'
                ? 'bg-accent-primary text-white shadow-sm'
                : 'text-gray-10 hover:bg-gray-2 hover:text-gray-12',
            )}
            onClick={() => {
              console.log('Toggle Clicked: table')
              setViewMode('table')
            }}
          >
            <Icon className='size-4' name='tabler:table' />
          </button>
        </div>
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
