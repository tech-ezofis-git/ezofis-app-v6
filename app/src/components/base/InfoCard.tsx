import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

type InfoCardVariant = 'danger' | 'info' | 'success'

type InfoCardProps = {
  description: string
  title: string
  className?: string
  variant?: InfoCardVariant
}

const VARIANT_CLASS: Record<
  InfoCardVariant,
  { icon: string; iconClass: string; shell: string }
> = {
  danger: {
    icon: 'lucide:alert-circle',
    iconClass: 'text-[var(--red-9)]',
    shell:
      'border-[var(--red-4)] border-l-[var(--red-9)] bg-[var(--red-1)] text-[var(--red-12)]',
  },
  info: {
    icon: 'lucide:info',
    iconClass: 'text-[var(--primary-9)]',
    shell:
      'border-[var(--primary-4)] border-l-[var(--primary-9)] bg-[var(--primary-1)] text-[var(--primary-12)]',
  },
  success: {
    icon: 'lucide:circle-check',
    iconClass: 'text-[var(--green-9)]',
    shell:
      'border-[var(--green-4)] border-l-[var(--green-9)] bg-[var(--green-1)] text-[var(--green-12)]',
  },
}

export default function InfoCard({
  className,
  description,
  title,
  variant = 'info',
}: InfoCardProps) {
  const tone = VARIANT_CLASS[variant]

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border border-l-4 px-3.5 py-3',
        tone.shell,
        className,
      )}
    >
      <Icon
        className={cn('size-5 shrink-0', tone.iconClass)}
        name={tone.icon}
      />
      <div className='min-w-0'>
        <p className='text-13 font-semibold leading-snug'>{title}</p>
        {description ? (
          <p className='mt-0.5 text-12 leading-relaxed font-medium opacity-90'>
            {description}
          </p>
        ) : null}
      </div>
    </div>
  )
}
