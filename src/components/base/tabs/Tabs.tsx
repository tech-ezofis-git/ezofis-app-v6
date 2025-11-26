import type { ReactNode } from 'react'
import { Tabs as Base } from '@mantine/core'
import cn from '@/utils/cn'

interface Props {
  children: ReactNode
  value: string | null
  color?: 'gray' | 'primary' | 'secondary'
  tabClassName?: string
  onChange: (value: string | null) => void
}

const Tabs = ({
  children,
  color = 'gray',
  tabClassName = 'h-13',
  value,
  onChange,
}: Props) => {
  const classNames = {
    list: 'before:border-0 gap-6',
    tab: cn(
      'group gap-2 px-0 font-medium text-gray-10 outline-0 transition-colors hover:border-transparent hover:bg-transparent hover:text-gray-12 focus-visible:bg-gray-4 data-[active]:text-gray-13 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      color === 'primary' && 'data-[active]:border-primary-9',
      color === 'gray' && 'data-[active]:border-gray-11',
      color === 'secondary' && 'd data-[active]:border-secondary-9',
      tabClassName,
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
