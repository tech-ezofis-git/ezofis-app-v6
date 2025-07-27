import type { IndicatorProps } from '@mantine/core'
import { Indicator as Base } from '@mantine/core'

type IndicatorColor = 'primary' | 'red'

interface Props {
  animate?: boolean
  children?: React.ReactNode
  className?: string
  color?: IndicatorColor
  disabled?: boolean
  offset?: number
  position?: IndicatorProps['position']
  size?: number
}

const colorClassName: Record<IndicatorColor, string> = {
  primary: 'bg-primary before:bg-primary',
  red: 'bg-red before:bg-red',
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
  return (
    <Base
      className={className}
      disabled={disabled}
      offset={offset}
      position={position}
      processing={animate}
      size={size}
      classNames={{
        indicator: colorClassName[color],
      }}
    >
      {children}
    </Base>
  )
}

Indicator.displayName = 'Indicator'
export default Indicator
