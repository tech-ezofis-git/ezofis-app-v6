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
  label?: ReactNode
  offset?: number
  position?: IndicatorProps['position']
  size?: number
}

const colorClassName: Record<IndicatorColor, string> = {
  primary: 'bg-primary-11 before:bg-primary-11',
  red: 'bg-red-11 before:bg-red-11',
  secondary: 'bg-secondary-11 before:bg-secondary-11',
}

const Indicator = ({
  animate,
  children,
  className,
  color = 'primary',
  disabled,
  label,
  offset,
  position,
  size = 5,
}: Props) => {
  return (
    <Base
      className={className}
      disabled={disabled}
      label={label}
      offset={offset}
      position={position}
      processing={animate}
      size={label !== undefined ? undefined : size}
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
