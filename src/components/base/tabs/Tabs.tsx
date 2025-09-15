import type { ReactNode } from 'react'
import { Tabs as Base } from '@mantine/core'
import cn from '@/utils/cn'

interface Props {
  children: ReactNode
  value: string | null
  color?: 'gray' | 'primary' | 'secondary'
  onChange: (value: string | null) => void
}

const Tabs = ({ children, color = 'gray', value, onChange }: Props) => {
  const classNames = {
    list: 'before:border-0 before:border-b before:border-gray-3',
    tab: cn(
      'group h-9 gap-2 px-4 py-2 font-medium text-gray-10 outline-0 transition-colors hover:border-transparent hover:bg-gray-4 hover:text-gray-11 focus-visible:bg-gray-4 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      color === 'primary' &&
        'data-[active]:border-primary-9 data-[active]:text-primary-9',
      color === 'gray' &&
        'data-[active]:border-gray-11 data-[active]:text-gray-12',
      color === 'secondary' &&
        'data-[active]:border-secondary-9 data-[active]:text-secondary-9',
    ),
    tabSection: cn(
      'm-0 text-gray-9 group-hover:text-gray-10 group-data-[active]:text-gray-11',
    ),
  }

  return (
    <Base classNames={classNames} value={value} onChange={onChange}>
      <Base.List>{children}</Base.List>
    </Base>
  )
}

Tabs.displayName = 'Tabs'
export default Tabs
