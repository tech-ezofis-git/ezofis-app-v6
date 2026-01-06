import { useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import type { Option } from '@/types/option'
import Divider from '@/components/base/Divider'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import Title from '@/components/base/Title'

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
  const { t } = useLingui()
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
  const name = 'Charles'

  return (
    <div className='flex flex-wrap items-end justify-between gap-6 border-b border-gray-3 p-6 xl:p-8'>
      <Title
        description={t`Here's your workflow automation overview for today.`}
        level={1}
        title={t`Welcome back, ${name}.`}
      />

      <div className='flex flex-wrap items-center gap-2'>
        <InputSelect
          leftSection={<Icon className='text-gray-10' name='lucide:box' />}
          options={modules}
          value={module}
          width={160}
          onChange={setModule}
        />
        <InputSelect
          leftSection={<Icon className='text-gray-10' name='lucide:workflow' />}
          options={moduleItems}
          value={moduleItem}
          width={240}
          searchable
          onChange={setModuleItem}
        />
        <Divider
          className='mx-2 my-auto hidden h-6 sm:block'
          orientation='vertical'
        />
        <InputSelect
          leftSection={<Icon className='text-gray-10' name='lucide:calendar' />}
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
