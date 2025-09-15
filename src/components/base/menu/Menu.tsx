import type { MenuProps as BaseProps } from '@mantine/core'
import type { ReactNode } from 'react'
import { Menu as Base } from '@mantine/core'
import cn from '@/utils/cn'

interface Props {
  children: ReactNode
  target: ReactNode
  className?: string
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
  closeOnItemClick = true,
  target,
  ...rest
}: Props) => {
  const _classNames = {
    dropdown: cn(
      'border border-gray-3 bg-surface-raised p-1 shadow-lg',
      className,
    ),
    item: 'group flex h-9 items-center gap-2 rounded px-2 text-gray-11 transition-colors hover:bg-gray-4 hover:text-gray-12 focus-visible:bg-gray-4 focus-visible:outline-0',
    itemLabel: 'font-medium transition-colors',
    itemSection: 'm-0 text-gray-9 group-hover:text-gray-10 transition-colors',
  }

  return (
    <Base
      {...rest}
      classNames={_classNames}
      closeOnItemClick={closeOnItemClick}
      transitionProps={{ transition: 'pop' }}
      returnFocus
    >
      <Base.Target>
        <div>{target}</div>
      </Base.Target>
      <Base.Dropdown>{children}</Base.Dropdown>
    </Base>
  )
}

Menu.displayName = 'Menu'
export default Menu
