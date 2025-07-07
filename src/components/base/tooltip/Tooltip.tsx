import type { TooltipProps } from '@mantine/core'
import { Tooltip as Primitive } from '@mantine/core'
import { cn } from '@/utils'

interface Props {
  children: React.ReactNode
  content: string
  closeDelay?: number
  color?: 'gray' | 'primary' | 'red'
  isMultiline?: boolean
  isOpened?: boolean
  offset?: TooltipProps['offset']
  openDelay?: number
  position?: TooltipProps['position']
  width?: number
}

const Tooltip: React.FC<Props> = ({
  children,
  closeDelay = 0,
  color = 'gray',
  content,
  isMultiline,
  isOpened,
  offset,
  openDelay = 0,
  position,
  width,
}) => {
  const colorClasses = {
    gray: 'bg-gray-800',
    primary: 'bg-primary',
    red: 'bg-red',
  }

  return (
    <Primitive
      arrowRadius={1.5}
      arrowSize={6}
      closeDelay={closeDelay}
      defaultOpened={isOpened}
      label={content}
      multiline={isMultiline}
      offset={offset}
      openDelay={openDelay}
      position={position}
      transitionProps={{ duration: 150 }}
      w={width}
      withArrow
      classNames={{
        tooltip: cn(
          'rounded px-2 py-1 text-xs font-medium text-white dark:text-black',
          colorClasses[color],
        ),
      }}
    >
      <div className='inline-block'>{children}</div>
    </Primitive>
  )
}

export default Tooltip
