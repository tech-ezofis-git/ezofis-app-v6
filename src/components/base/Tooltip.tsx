import type { TooltipProps as BaseProps } from '@mantine/core'
import type { ReactNode } from 'react'
import { Tooltip as Base } from '@mantine/core'
import cn from '@/utils/cn'

interface Props {
  children: ReactNode
  content: string
  closeDelay?: number
  color?: TooltipColor
  disabled?: boolean
  offset?: BaseProps['offset']
  openDelay?: number
  opened?: boolean
  position?: BaseProps['position']
  width?: number
}

type TooltipColor = 'gray' | 'primary' | 'secondary' | 'red'

const colorClassName: Record<TooltipColor, string> = {
  gray: 'bg-gray-12 text-gray-0',
  primary: 'bg-primary-9',
  red: 'bg-red-9',
  secondary: 'bg-secondary-9',
}

const Tooltip = ({
  children,
  closeDelay = 0,
  color = 'gray',
  content,
  disabled,
  offset,
  openDelay = 0,
  opened,
  position,
  width,
}: Props) => {
  const _className = cn(
    'rounded px-2 py-1 text-xs font-medium text-white',
    colorClassName[color],
  )

  return (
    <Base
      arrowOffset={8}
      arrowRadius={1.5}
      arrowSize={6}
      closeDelay={closeDelay}
      defaultOpened={opened}
      disabled={disabled}
      label={content}
      multiline={!!width}
      offset={offset}
      openDelay={openDelay}
      position={position}
      transitionProps={{ duration: 150 }}
      w={width}
      withArrow
      classNames={{
        tooltip: _className,
      }}
    >
      <div className='group inline-flex items-center justify-center'>
        {children}
      </div>
    </Base>
  )
}

Tooltip.displayName = 'Tooltip'
export default Tooltip
