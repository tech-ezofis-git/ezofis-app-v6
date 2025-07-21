import { cn } from '@/utils'

interface Props {
  color?:
    | 'gray'
    | 'primary'
    | 'red'
    | 'orange'
    | 'yellow'
    | 'green'
    | 'blue'
    | 'violet'
    | 'pink'
  label?: string
}

const Badge: React.FC<Props> = ({ color = 'gray', label }) => {
  const colorClasses = {
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

  return (
    <span
      className={cn(
        'inline-flex h-6 w-fit shrink-0 items-center justify-center rounded px-2 text-xs font-medium whitespace-nowrap',
        colorClasses[color],
      )}
    >
      {label}
    </span>
  )
}

export default Badge
