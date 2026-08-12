import type { MenuProps as BaseProps } from '@mantine/core'
import type { ReactNode } from 'react'
import { Menu as Base } from '@mantine/core'
import cn from '@/utils/cn'

interface Props {
  children: ReactNode
  target: ReactNode
  className?: string
  closeOnClickOutside?: boolean
  closeOnItemClick?: boolean
  defaultOpened?: boolean
  offset?: BaseProps['offset']
  opened?: boolean
  position?: BaseProps['position']
  width?: BaseProps['width']
  withinPortal?: BaseProps['withinPortal']
  onChange?: BaseProps['onChange']
}

const Menu = ({
  children,
  className,
  closeOnClickOutside = true,
  closeOnItemClick = true,
  target,
  ...rest
}: Props) => {
  const _classNames = {
    dropdown: cn(
      'rounded-lg border border-gray-3 bg-surface-raised p-1 shadow-md',
      className,
    ),
    item: 'group flex h-8 items-center gap-2 rounded px-2 text-gray-12 transition-colors hover:bg-gray-4 hover:text-gray-13 focus-visible:bg-gray-4 focus-visible:outline-0',
    itemLabel: 'font-normal transition-colors text-13',
    itemSection: 'm-0 text-gray-10 group-hover:text-gray-11 transition-colors',
  }

  return (
    <Base
      {...rest}
      classNames={_classNames}
      closeOnClickOutside={closeOnClickOutside}
      closeOnItemClick={closeOnItemClick}
      transitionProps={{ transition: 'pop' }}
      returnFocus
    >
      {/*
        Wrap target in a div: Mantine Target needs a ref-capable element.
        Triggers like UserMenuTrigger / Tooltip stacks don't forward refs.
        Do not put stopPropagation on the inner target — it blocks open.
      */}
      <Base.Target>
        <div className='inline-flex'>{target}</div>
      </Base.Target>
      <Base.Dropdown>{children}</Base.Dropdown>
    </Base>
  )
}

Menu.displayName = 'Menu'
export default Menu
