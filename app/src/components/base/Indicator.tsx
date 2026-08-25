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
  size,
}: Props) => {
  // A plain dot (no label) stays tiny (5px). A labeled badge (e.g. a count)
  // needs enough height for its own text, otherwise Mantine's fixed
  // `height: var(--indicator-size)` clips to the dot size and the
  // horizontal-only label padding makes it read as an oval instead of a
  // circle — 16 is enough for one or two digits to sit in a true circle.
  const resolvedSize = size ?? (label !== undefined ? 16 : 5)
  return (
    <Base
      className={className}
      disabled={disabled}
      label={label}
      offset={offset}
      position={position}
      processing={animate}
      size={resolvedSize}
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
