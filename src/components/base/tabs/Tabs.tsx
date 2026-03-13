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
      '!group !hover:border-transparent !hover:bg-transparent !hover:text-gray-12 !focus-visible:bg-transparent !focus-visible:text-gray-12 !focus-visible:underline !data-[active]:text-gray-13 !data-[disabled]:pointer-events-none !data-[disabled]:opacity-50 !gap-2 !px-0 !text-13 !font-medium !text-gray-10 !outline-0 !transition-all active:scale-95',
      color === 'primary' && 'data-[active]:border-accent-primary',
      color === 'gray' && 'data-[active]:border-gray-11',
      color === 'secondary' && 'data-[active]:border-secondary-9',
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
