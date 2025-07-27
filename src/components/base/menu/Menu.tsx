import type { MenuProps as BaseProps } from '@mantine/core'
import { Menu as Base } from '@mantine/core'

interface Props {
  children: React.ReactNode
  target: React.ReactNode
  defaultOpened?: boolean
  offset?: BaseProps['offset']
  position?: BaseProps['position']
  width?: BaseProps['width']
}

const classNames = {
  dropdown: 'border-0 bg-surface-raised ring-1 ring-gray-600/10',
  item: 'group flex h-9 items-center gap-2 rounded px-2 hover:bg-surface-raised-hover hover:transition-colors focus-visible:bg-surface-raised-hover focus-visible:outline-0',
  itemLabel:
    'font-medium text-gray-700 group-hover:text-gray-750 group-hover:transition-colors',
  itemSection: 'm-0',
}

const Menu: React.FC<Props> = ({
  children,
  defaultOpened,
  offset,
  position,
  target,
  width,
}) => {
  return (
    <Base
      classNames={classNames}
      defaultOpened={defaultOpened}
      offset={offset}
      position={position}
      transitionProps={{ transition: 'pop' }}
      width={width}
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
