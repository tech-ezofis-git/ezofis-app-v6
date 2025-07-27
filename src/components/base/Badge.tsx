import React from 'react'
import cn from '@/utils/cn'

type BadgeColor =
  | 'gray'
  | 'primary'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'violet'
  | 'pink'

interface Props {
  className?: string
  color?: BadgeColor
  label?: string
}

const colorClassName: Record<BadgeColor, string> = {
  blue: 'bg-blue/10 text-blue',
  gray: 'bg-gray-600/10 text-gray-700',
  green: 'bg-green/10 text-green',
  orange: 'bg-orange/10 text-orange',
  pink: 'bg-pink/10 text-pink',
  primary: 'bg-primary/10 text-primary',
  red: 'bg-red/10 text-red',
  violet: 'bg-violet/10 text-violet',
  yellow: 'bg-yellow/10 text-yellow',
}

const Badge: React.FC<Props> = ({ className, color = 'gray', label }) => {
  const computedClassName = cn(
    'inline-flex h-6 w-fit shrink-0 items-center justify-center rounded px-2 text-xs font-medium whitespace-nowrap',
    colorClassName[color],
    className,
  )

  return <span className={computedClassName}>{label}</span>
}

Badge.displayName = 'Badge'
export default Badge
