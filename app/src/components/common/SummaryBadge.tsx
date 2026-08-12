import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

interface Props {
  label: string
  theme: 'green' | 'orange' | 'red' | 'blue'
  className?: string
  icon?: string
  variant?: 'soft' | 'outline'
}

const softStyles = {
  blue: 'bg-blue-3 text-blue-11',
  green: 'bg-green-3 text-green-11',
  orange: 'bg-orange-3 text-orange-11',
  red: 'bg-red-3 text-red-11',
}

const outlineStyles = {
  blue: 'border border-blue-7 text-blue-11 bg-transparent',
  green: 'border border-green-7 text-green-11 bg-transparent',
  orange: 'border border-orange-7 text-orange-11 bg-transparent',
  red: 'border border-red-7 text-red-11 bg-transparent',
}

const SummaryBadge = ({
  className,
  icon,
  label,
  theme,
  variant = 'soft',
}: Props) => {
  const customStyles =
    variant === 'outline' ? outlineStyles[theme] : softStyles[theme]

  return (
    <span
      className={cn(
        'inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 rounded px-2 text-12 font-medium whitespace-nowrap',
        customStyles,
        className,
      )}
    >
      {icon && <Icon className='size-3.5' name={icon} />}
      {label}
    </span>
  )
}

SummaryBadge.displayName = 'SummaryBadge'
export default SummaryBadge
