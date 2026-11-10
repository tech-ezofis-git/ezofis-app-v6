import type { TooltipProps as BaseProps } from '@mantine/core'
import type { ReactNode } from 'react'
import { Tooltip as Base } from '@mantine/core'
import cn from '@/utils/cn'

interface Props {
  children: ReactNode
  content: string
  className?: string
  closeDelay?: number
  color?: TooltipColor
  disabled?: boolean
  offset?: BaseProps['offset']
  openDelay?: number
  opened?: boolean
  position?: BaseProps['position']
  width?: number
  zIndex?: number
}

type TooltipColor = 'gray' | 'primary' | 'secondary' | 'red' | 'white'

const colorClassName: Record<TooltipColor, string> = {
  gray: 'bg-gray-12 text-gray-0',
  primary: 'bg-primary-9',
  red: 'bg-red-9',
  secondary: 'bg-secondary-9',
  // Light card, same look as the routes popup.
  white:
    'rounded-xl border border-gray-3 bg-surface px-3 py-2 text-[13px] font-medium !text-gray-13 shadow-2xl',
}

const Tooltip = ({
  children,
  className,
  closeDelay = 0,
  color = 'gray',
  content,
  disabled,
  offset,
  openDelay = 0,
  opened,
  position,
  width,
  zIndex = 1000000,
}: Props) => {
  const _className = cn(
    color !== 'white' && 'rounded px-2 py-1 text-xs text-white',
    colorClassName[color],
  )

  return (
    <Base
      arrowOffset={8}
      arrowRadius={1.5}
      arrowSize={6}
      closeDelay={closeDelay}
      defaultOpened={opened}
      disabled={disabled || !content?.trim?.()}
      label={content}
      multiline={!!width}
      offset={offset}
      openDelay={openDelay}
      position={position}
      w={width}
      withArrow={color !== 'white'}
      zIndex={zIndex}
      classNames={{
        tooltip: _className,
      }}
    >
      <div
        className={cn(
          'group inline-flex max-w-full min-w-0 items-center',
          !className?.includes('justify-') && 'justify-start',
          className,
        )}
      >
        {children}
      </div>
    </Base>
  )
}

Tooltip.displayName = 'Tooltip'
export default Tooltip
