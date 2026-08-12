import type { PopoverProps as BaseProps } from '@mantine/core'
import type { ReactNode } from 'react'
import { Popover as Base } from '@mantine/core'

interface Props {
  children: ReactNode
  target: ReactNode
  offset?: BaseProps['offset']
  opened?: boolean
  position?: BaseProps['position']
  width?: BaseProps['width']
  withArrow?: boolean
  onChange?: (opened: boolean) => void
}

const classNames = {
  arrow: 'bg-surface-raised',
  dropdown: 'bg-surface-raised p-0 shadow-md border border-gray-3',
}

const Popover = ({
  children,
  offset,
  opened,
  position,
  target,
  width,
  withArrow = false,
  onChange,
}: Props) => {
  return (
    <Base
      arrowOffset={20}
      arrowRadius={1}
      arrowSize={10}
      classNames={classNames}
      offset={offset}
      opened={opened}
      position={position}
      transitionProps={{ duration: 150 }}
      width={width}
      withArrow={withArrow}
      onChange={onChange}
    >
      {/* Wrap target so Target always has a stable ref-capable element. */}
      <Base.Target>
        <div className='inline-flex'>{target}</div>
      </Base.Target>
      <Base.Dropdown>{children}</Base.Dropdown>
    </Base>
  )
}

Popover.displayName = 'Popover'
export default Popover
