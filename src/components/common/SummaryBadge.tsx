import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

interface Props {
    label: string
    icon?: string
    theme: 'green' | 'orange' | 'red' | 'blue'
    variant?: 'soft' | 'outline'
    className?: string
}

const softStyles = {
    green: 'bg-green-3 text-green-11',
    orange: 'bg-orange-3 text-orange-11',
    red: 'bg-red-3 text-red-11',
    blue: 'bg-blue-3 text-blue-11',
}

const outlineStyles = {
    green: 'border border-green-7 text-green-11 bg-transparent',
    orange: 'border border-orange-7 text-orange-11 bg-transparent',
    red: 'border border-red-7 text-red-11 bg-transparent',
    blue: 'border border-blue-7 text-blue-11 bg-transparent',
}

const SummaryBadge = ({ label, icon, theme, variant = 'soft', className }: Props) => {
    const customStyles = variant === 'outline' ? outlineStyles[theme] : softStyles[theme]

    return (
        <span
            className={cn(
                'inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 rounded px-2 text-12 font-medium whitespace-nowrap',
                customStyles,
                className
            )}
        >
            {icon && <Icon name={icon} className="size-3.5" />}
            {label}
        </span>
    )
}

SummaryBadge.displayName = 'SummaryBadge'
export default SummaryBadge
