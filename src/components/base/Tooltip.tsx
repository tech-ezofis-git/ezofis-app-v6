import type { TooltipProps as BaseProps } from '@mantine/core'
import { Tooltip as Base } from '@mantine/core'
import React from 'react'
import cn from '@/utils/cn'

interface Props {
  children: React.ReactNode
  content: string
  closeDelay?: number
  color?: TooltipColor
  isOpened?: boolean
  offset?: BaseProps['offset']
  openDelay?: number
  position?: BaseProps['position']
  width?: number
}

type TooltipColor = 'gray' | 'primary' | 'red'

const colorClassName: Record<TooltipColor, string> = {
  gray: 'bg-gray-800',
  primary: 'bg-primary',
  red: 'bg-red',
}

const Tooltip: React.FC<Props> = ({
  children,
  closeDelay = 0,
  color = 'gray',
  content,
  isOpened,
  offset,
  openDelay = 0,
  position,
  width,
}) => {
  const computedClassName = cn(
    'rounded px-2 py-1 text-xs font-medium text-gray-0',
    colorClassName[color],
  )

  return (
    <Base
      arrowOffset={8}
      arrowRadius={1.5}
      arrowSize={6}
      closeDelay={closeDelay}
      defaultOpened={isOpened}
      label={content}
      multiline={!!width}
      offset={offset}
      openDelay={openDelay}
      position={position}
      transitionProps={{ duration: 150 }}
      w={width}
      withArrow
      classNames={{
        tooltip: computedClassName,
      }}
    >
      <div className='group inline-block'>{children}</div>
    </Base>
  )
}

Tooltip.displayName = 'Tooltip'
export default Tooltip
