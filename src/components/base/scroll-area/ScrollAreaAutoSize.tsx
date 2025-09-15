import type { ScrollAreaProps as BaseProps } from '@mantine/core'
import type { ReactNode } from 'react'
import { ScrollArea as Base } from '@mantine/core'

interface Props {
  children?: ReactNode
  className?: string
  height?: number
  maxHeight?: BaseProps['mah']
  maxWidth?: BaseProps['maw']
  scrollbars?: BaseProps['scrollbars']
  scrollbarSize?: number
  type?: BaseProps['type']
  viewportRef?: BaseProps['viewportRef']
  width?: number
  onBottomReached?: () => void
  onScrollPositionChange?: BaseProps['onScrollPositionChange']
  onTopReached?: () => void
}

const ScrollAreaAutoSize = ({
  children,
  className,
  maxHeight,
  maxWidth,
  scrollbars = 'y',
  scrollbarSize = 6,
  type = 'auto',
  ...rest
}: Props) => {
  return (
    <Base.Autosize
      {...rest}
      className={className}
      mah={maxHeight ?? '100%'}
      maw={maxWidth ?? '100%'}
      scrollbars={scrollbars}
      scrollbarSize={scrollbarSize}
      type={type}
      classNames={{
        scrollbar: 'w-1 p-0',
        thumb: 'bg-gray-8',
      }}
    >
      {children}
    </Base.Autosize>
  )
}

ScrollAreaAutoSize.displayName = 'ScrollAreaAutoSize'
export default ScrollAreaAutoSize
