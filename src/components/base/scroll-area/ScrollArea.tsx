import type { ScrollAreaProps } from '@mantine/core'
import { ScrollArea as Primitive } from '@mantine/core'

interface Props {
  children?: React.ReactNode
  className?: string
  height?: number
  onScrollPositionChange?: ScrollAreaProps['onScrollPositionChange']
  scrollbars?: ScrollAreaProps['scrollbars']
  scrollbarSize?: number
  type?: ScrollAreaProps['type']
  width?: number
  onBottomReached?: () => void
}

const ScrollArea: React.FC<Props> = ({
  children,
  className,
  height,
  onBottomReached,
  onScrollPositionChange,
  scrollbars = 'y',
  scrollbarSize = 6,
  type,
  width,
}) => {
  return (
    <Primitive
      className={className}
      h={height}
      scrollbars={scrollbars}
      scrollbarSize={scrollbarSize}
      type={type}
      w={width}
      offsetScrollbars
      onBottomReached={onBottomReached}
      onScrollPositionChange={onScrollPositionChange}
    >
      {children}
    </Primitive>
  )
}

ScrollArea.displayName = 'ScrollArea'
export default ScrollArea
