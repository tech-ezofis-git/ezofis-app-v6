import type { PopoverProps } from '@mantine/core'
import { Popover as Primitive } from '@mantine/core'

interface Props {
  children: React.ReactNode
  target: React.ReactNode
  offset?: PopoverProps['offset']
  position?: PopoverProps['position']
  width?: PopoverProps['width']
}

const Popover: React.FC<Props> = ({
  children,
  offset,
  position,
  target,
  width,
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
      withArrow
      classNames={{
        arrow: 'border-gray-150 bg-surface-emphasized dark:border-gray-200',
        dropdown:
          'border-gray-100 bg-surface-emphasized p-0 shadow-emphasized dark:border-gray-150',
      }}
    >
      <Primitive.Target>{target}</Primitive.Target>
      <Primitive.Dropdown>{children}</Primitive.Dropdown>
    </Primitive>
  )
}

export default Popover
