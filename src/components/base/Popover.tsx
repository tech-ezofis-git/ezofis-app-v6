import type { PopoverProps as BaseProps } from '@mantine/core'
import type { ReactNode } from 'react'
import { Popover as Base } from '@mantine/core'

interface Props {
  children: ReactNode
  target: ReactNode
  offset?: BaseProps['offset']
  position?: BaseProps['position']
  width?: BaseProps['width']
  withArrow?: boolean
  opened?: boolean
  onChange?: (opened: boolean) => void
}

const classNames = {
  arrow: 'bg-surface-raised',
  dropdown: 'bg-surface-raised p-0 shadow-md border border-gray-3',
}

const Popover = ({
  children,
  offset,
  position,
  target,
  width,
  withArrow = false,
  opened,
  onChange,
}: Props) => {
  return (
    <Base
      opened={opened}
      onChange={onChange}
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
