import type { IndicatorProps } from '@mantine/core'
import type { ReactNode } from 'react'
import { Indicator as Base } from '@mantine/core'

type IndicatorColor = 'primary' | 'red' | 'secondary'

interface Props {
  animate?: boolean
  children?: ReactNode
  className?: string
  color?: IndicatorColor
  disabled?: boolean
  offset?: number
  position?: IndicatorProps['position']
  size?: number
}

const colorClassName: Record<IndicatorColor, string> = {
  primary: 'bg-primary-9 before:bg-primary-9',
  red: 'bg-red-9 before:bg-red-9',
  secondary: 'bg-secondary-9 before:bg-secondary-9',
}

const Indicator = ({
  animate,
  children,
  className,
  color = 'primary',
  disabled,
  offset,
  position,
  size = 8,
}: Props) => {
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
