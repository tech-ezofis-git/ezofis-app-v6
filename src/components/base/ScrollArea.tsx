import type { ScrollAreaProps as BaseProps } from '@mantine/core'
import { ScrollArea as Base } from '@mantine/core'

interface Props {
  children?: React.ReactNode
  className?: string
  height?: number
  scrollbars?: BaseProps['scrollbars']
  scrollbarSize?: number
  type?: BaseProps['type']
  viewportRef?: BaseProps['viewportRef']
  width?: number
  onBottomReached?: () => void
  onScrollPositionChange?: BaseProps['onScrollPositionChange']
  onTopReached?: () => void
}

const ScrollArea: React.FC<Props> = ({
  children,
  className,
  height,
  scrollbars = 'y',
  scrollbarSize = 6,
  type,
  viewportRef,
  width,
  onBottomReached,
  onScrollPositionChange,
  onTopReached,
}) => {
  return (
    <Base
      className={className}
      h={height}
      overscrollBehavior='contain'
      scrollbars={scrollbars}
      scrollbarSize={scrollbarSize}
      type={type}
      viewportRef={viewportRef}
      w={width}
      onBottomReached={onBottomReached}
      onScrollPositionChange={onScrollPositionChange}
      onTopReached={onTopReached}
    >
      {children}
    </Base>
  )
}

ScrollArea.displayName = 'ScrollArea'
export default ScrollArea
