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
    list: 'animate-in fade-in slide-in-from-left-4 duration-300 before:border-0 gap-6',
    tab: cn(
      'group !gap-2 !px-0 !text-13 !font-medium !text-gray-10 !outline-0 !transition-all hover:!bg-transparent hover:!text-gray-12 focus-visible:!bg-transparent focus-visible:!text-gray-12 focus-visible:!underline active:scale-95 data-[active]:!text-gray-13 data-[disabled]:!pointer-events-none data-[disabled]:!opacity-50',
      color === 'primary' &&
        'hover:!border-primary-4 data-[active]:border-accent-primary data-[active]:hover:!border-accent-primary',
      color === 'gray' &&
        'hover:!border-gray-5 data-[active]:border-gray-11 data-[active]:hover:!border-gray-11',
      color === 'secondary' &&
        'hover:!border-secondary-4 data-[active]:border-secondary-9 data-[active]:hover:!border-secondary-9',
      tabClassName,
    ),
    tabSection: cn(
      'sm-0 text-gray-9 group-hover:text-gray-10 group-data-[active]:text-gray-11',
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
