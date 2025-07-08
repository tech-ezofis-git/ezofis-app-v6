import type { IndicatorProps } from '@mantine/core'
import { Indicator as Primitive } from '@mantine/core'

interface Props {
  animate?: boolean
  children?: React.ReactNode
  className?: string
  color?: 'primary' | 'red'
  disabled?: boolean
  offset?: number
  position?: IndicatorProps['position']
  size?: number
}

const Indicator: React.FC<Props> = ({
  animate,
  children,
  className,
  color = 'primary',
  disabled,
  offset,
  position,
  size = 8,
}) => {
  const colorClasses = {
    primary: 'bg-primary-bc before:bg-primary-bc',
    red: 'bg-red-bc before:bg-red-bc',
  }

  return (
    <Primitive
      className={className}
      disabled={disabled}
      offset={offset}
      position={position}
      processing={animate}
      size={size}
      classNames={{
        indicator: colorClasses[color],
      }}
    >
      {children}
    </Primitive>
  )
}

export default Indicator
