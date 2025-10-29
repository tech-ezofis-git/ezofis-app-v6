import cn from '@/utils/cn'

export type BadgeColor =
  | 'blue'
  | 'bronze'
  | 'cyan'
  | 'gold'
  | 'gray'
  | 'green'
  | 'indigo'
  | 'orange'
  | 'pink'
  | 'purple'
  | 'red'
  | 'teal'
  | 'violet'
  | 'yellow'

interface Props {
  className?: string
  color?: BadgeColor
  label?: string
}

const colorClassName: Record<BadgeColor, string> = {
  blue: 'bg-blue-3 text-blue-11',
  bronze: 'bg-bronze-3 text-bronze-11',
  cyan: 'bg-cyan-3 text-cyan-11',
  gold: 'bg-gold-3 text-gold-11',
  gray: 'bg-gray-3 text-gray-12',
  green: 'bg-green-3 text-green-11',
  indigo: 'bg-indigo-3 text-indigo-11',
  orange: 'bg-orange-3 text-orange-11',
  pink: 'bg-pink-3 text-pink-11',
  purple: 'bg-purple-3 text-purple-11',
  red: 'bg-red-3 text-red-11',
  teal: 'bg-teal-3 text-teal-11',
  violet: 'bg-violet-3 text-violet-11',
  yellow: 'bg-yellow-3 text-yellow-11',
}

const Badge = ({ className, color = 'gray', label }: Props) => {
  const _className = cn(
    'inline-flex h-6 w-fit shrink-0 items-center justify-center rounded px-2 text-mini font-medium whitespace-nowrap',
    colorClassName[color],
    className,
  )

  return <span className={_className}>{label}</span>
}

Badge.displayName = 'Badge'
export default Badge
