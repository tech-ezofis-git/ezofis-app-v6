import type { PopoverProps } from '@mantine/core'
import { Popover as Primitive } from '@mantine/core'

interface Props {
  children: React.ReactNode
  target: React.ReactNode
  offset?: PopoverProps['offset']
  position?: PopoverProps['position']
  width?: PopoverProps['width']
  withArrow?: boolean
}

const Popover: React.FC<Props> = ({
  children,
  offset,
  position,
  target,
  width,
  withArrow = true,
}) => {
  return (
    <Primitive
      arrowOffset={20}
      arrowRadius={1}
      arrowSize={10}
      offset={offset}
      position={position}
      transitionProps={{ duration: 150 }}
      width={width}
      withArrow={withArrow}
      classNames={{
        arrow: 'bg-surface-raised',
        dropdown: 'border-0 bg-surface-raised p-0 ring-1 ring-gray-600/10',
      }}
    >
      <Primitive.Target>{target}</Primitive.Target>
      <Primitive.Dropdown>{children}</Primitive.Dropdown>
    </Primitive>
  )
}

Popover.displayName = 'Popover'
export default Popover
