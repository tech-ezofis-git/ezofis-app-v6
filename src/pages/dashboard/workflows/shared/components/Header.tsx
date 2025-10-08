import { useState } from 'react'
import type { Option } from '@/types/option'
import Divider from '@/components/base/Divider'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'

const modules = [
  {
    disabled: false,
    id: 1,
    name: 'All',
  },
  {
    disabled: false,
    id: 2,
    name: 'Workflows',
  },
  {
    disabled: false,
    id: 3,
    name: 'Forms',
  },
  {
    disabled: false,
    id: 4,
    name: 'Folders',
  },
  {
    disabled: false,
    id: 5,
    name: 'Tasks',
  },
  {
    disabled: false,
    id: 6,
    name: 'Portals',
  },
]
const moduleItems = [
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
const dateRanges = [
  {
    disabled: false,
    id: 1,
    name: 'Today',
  },
  {
    disabled: false,
    id: 2,
    name: 'This Week',
  },
  {
    disabled: false,
    id: 3,
    name: 'Last Week',
  },
  {
    disabled: false,
    id: 4,
    name: 'This Month',
  },
  {
    disabled: false,
    id: 5,
    name: 'Last Month',
  },
]

const Header = () => {
  const [module, setModule] = useState<Option | null>({
    disabled: false,
    id: 2,
    name: 'Workflows',
  })
  const [moduleItem, setModuleItem] = useState<Option | null>({
    disabled: false,
    id: 1,
    name: 'Accounts Payable',
  })
  const [dateRange, setDateRange] = useState<Option | null>({
    disabled: false,
    id: 1,
    name: 'Today',
  })

  return (
    <div className='flex flex-wrap items-end justify-between gap-6 border-b border-gray-3 px-6 py-8 md:px-10'>
      <div>
        <div className='mb-2 font-poppins text-xl font-bold text-gray-13'>
          Welcome back, Charles.
        </div>
        <div className='text-gray-11'>
          Here's your workflow automation overview for today.
        </div>
      </div>

      <div className='flex flex-wrap items-center gap-2'>
        <InputSelect
          leftSection={<Icon className='text-gray-11' name='tabler:cube' />}
          options={modules}
          value={module}
          width={160}
          onChange={setModule}
        />
        <InputSelect
          leftSection={<Icon className='text-gray-11' name='tabler:replace' />}
          options={moduleItems}
          value={moduleItem}
          width={240}
          searchable
          onChange={setModuleItem}
        />
        <Divider
          className='mx-2 my-auto hidden h-5 sm:block'
          orientation='vertical'
        />
        <InputSelect
          leftSection={<Icon className='text-gray-11' name='tabler:calendar' />}
          options={dateRanges}
          position='bottom-end'
          value={dateRange}
          width={160}
          onChange={setDateRange}
        />
      </div>
    </div>
  )
}

Header.displayName = 'Header'
export default Header
