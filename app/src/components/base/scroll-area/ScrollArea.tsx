import type { ScrollAreaProps as BaseProps } from '@mantine/core'
import type { ReactNode } from 'react'
import { ScrollArea as Base } from '@mantine/core'

interface Props {
  children?: ReactNode
  className?: string
  height?: BaseProps['h']
  overscrollBehavior?: BaseProps['overscrollBehavior']
  scrollbars?: BaseProps['scrollbars']
  scrollbarSize?: number
  type?: BaseProps['type']
  viewportRef?: BaseProps['viewportRef']
  width?: BaseProps['w']
  onBottomReached?: () => void
  onScrollPositionChange?: BaseProps['onScrollPositionChange']
  onTopReached?: () => void
}

const ScrollArea = ({
  children,
  className,
  height,
  overscrollBehavior = 'auto',
  scrollbars = 'y',
  scrollbarSize = 6,
  type = 'auto',
  width,
  ...rest
}: Props) => {
  return (
    <Base
      {...rest}
      className={className}
      h={height}
      overscrollBehavior={overscrollBehavior}
      scrollbars={scrollbars}
      scrollbarSize={scrollbarSize}
      type={type}
      w={width}
      classNames={{
        content: 'h-full',
        scrollbar: 'w-1 p-0',
        thumb: 'bg-gray-8',
      }}
    >
      {children}
    </Base>
  )
}

ScrollArea.displayName = 'ScrollArea'
export default ScrollArea
