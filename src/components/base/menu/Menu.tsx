import type { MenuProps } from '@mantine/core'
import { Menu as Primitive } from '@mantine/core'

interface Props {
  children: React.ReactNode
  target: React.ReactNode
  defaultOpened?: boolean
  offset?: MenuProps['offset']
  position?: MenuProps['position']
  width?: MenuProps['width']
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
    <Primitive
      defaultOpened={defaultOpened}
      offset={offset}
      position={position}
      transitionProps={{ transition: 'pop' }}
      width={width}
      returnFocus
      classNames={{
        dropdown: 'border-0 bg-surface-raised ring-1 ring-gray-600/10',
        item: 'group flex h-9 items-center gap-2 rounded px-2 hover:bg-surface-raised-hover hover:transition-colors focus-visible:bg-surface-raised-hover focus-visible:outline-0',
        itemLabel:
          'font-medium text-gray-700 group-hover:text-gray-750 group-hover:transition-colors',
        itemSection: 'm-0',
      }}
    >
      <Primitive.Target>
        <div>{target}</div>
      </Primitive.Target>
      <Primitive.Dropdown>{children}</Primitive.Dropdown>
    </Primitive>
  )
}

Menu.displayName = 'Menu'
export default Menu
