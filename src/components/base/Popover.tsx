import type { PopoverProps } from '@mantine/core'
import { Popover as Base } from '@mantine/core'

interface Props {
  children: React.ReactNode
  target: React.ReactNode
  offset?: PopoverProps['offset']
  position?: PopoverProps['position']
  width?: PopoverProps['width']
  withArrow?: boolean
}

const classNames = {
  arrow: 'bg-surface-raised',
  dropdown: 'border-0 bg-surface-raised p-0 ring-1 ring-gray-600/10',
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
    <Base
      arrowOffset={20}
      arrowRadius={1}
      arrowSize={10}
      classNames={classNames}
      offset={offset}
      position={position}
      transitionProps={{ duration: 150 }}
      width={width}
      withArrow={withArrow}
    >
      <Base.Target>{target}</Base.Target>
      <Base.Dropdown>{children}</Base.Dropdown>
    </Base>
  )
}

Popover.displayName = 'Popover'
export default Popover
