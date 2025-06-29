import type { ScrollAreaProps } from '@mantine/core'
import { ScrollArea as Primitive } from '@mantine/core'

interface Props {
  children?: React.ReactNode
  height?: number
  scrollbarSize?: number
  type?: ScrollAreaProps['type']
  width?: number
}

const ScrollArea: React.FC<Props> = ({
  children,
  height,
  scrollbarSize = 6,
  type,
  width,
}) => {
  return (
    <Primitive
      h={height}
      scrollbarSize={scrollbarSize}
      type={type}
      w={width}
      offsetScrollbars
    >
      {children}
    </Primitive>
  )
}

export default ScrollArea
