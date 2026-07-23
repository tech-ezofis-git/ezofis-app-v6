import type { ReactNode } from 'react'
import cn from '@/utils/cn'
import { Badge } from '../../components/primitives/Badge'
import { Icon } from '../../components/primitives/Icon'

export type RequestCardTone = 'error' | 'success' | 'warning' | 'accent'

export type RequestCardData = {
  id: string
  vendor: string
  reference: string
  amount: string
  status: string
  statusTone: RequestCardTone
  meta: string
  aiNote?: string
}

const iconToneClass: Record<RequestCardTone, string> = {
  error: 'bg-red-3 text-error-main',
  success: 'bg-success-subtle text-success-main',
  warning: 'bg-orange-3 text-warning-main',
  accent: 'bg-accent-soft text-accent-primary',
}

const badgeTone: Record<
  RequestCardTone,
  'error' | 'success' | 'warning' | 'accent'
> = {
  error: 'error',
  success: 'success',
  warning: 'warning',
  accent: 'accent',
}

type RequestCardProps = {
  item: RequestCardData
  onSelect?: (id: string) => void
}

export function RequestCard({ item, onSelect }: RequestCardProps) {
  return (
    <button
      className={cn(
        'w-full rounded-xl border border-border-default bg-surface-primary p-2.5 text-left shadow-sm transition-all',
        'animate-in fade-in slide-in-from-bottom-2 duration-300 hover:bg-surface-hover active:scale-[0.99]',
      )}
      type='button'
      onClick={() => onSelect?.(item.id)}
    >
      <div className='flex items-start gap-2'>
        <RequestCardIcon tone={item.statusTone} />
        <div className='min-w-0 flex-1'>
          <div className='flex items-start justify-between gap-2'>
            <div className='min-w-0'>
              <p className='truncate text-12 font-semibold text-text-primary'>
                {item.vendor}
              </p>
              <p className='mt-0.5 truncate text-11 text-text-muted'>
                {item.reference}
              </p>
            </div>
            <p className='shrink-0 text-12 font-semibold text-text-primary'>
              {item.amount}
            </p>
          </div>
          <div className='mt-1.5 flex flex-wrap items-center gap-1.5'>
            <Badge tone={badgeTone[item.statusTone]}>{item.status}</Badge>
            <span className='text-11 text-text-muted'>{item.meta}</span>
          </div>
          {item.aiNote ? (
            <p className='mt-1.5 flex items-center gap-1 text-11 font-medium text-accent-primary'>
              <Icon className='size-3' name='Sparkles' />
              <span className='truncate'>{item.aiNote}</span>
            </p>
          ) : null}
        </div>
      </div>
    </button>
  )
}

function RequestCardIcon({ tone }: { tone: RequestCardTone }) {
  return (
    <span
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-full',
        iconToneClass[tone],
      )}
    >
      <Icon className='size-3.5' name='FileText' />
    </span>
  )
}

type FilterChipProps = {
  label: string
  count: number
  icon: ReactNode
  active?: boolean
  onClick?: () => void
}

export function FilterChip({
  label,
  count,
  icon,
  active,
  onClick,
}: FilterChipProps) {
  return (
    <button
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1.5 text-11 font-medium transition-all active:scale-95',
        active
          ? 'border-accent-primary bg-accent-soft text-accent-primary'
          : 'border-border-default bg-surface-primary text-text-secondary hover:bg-surface-hover',
      )}
      type='button'
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
      <span className='font-bold'>{count}</span>
    </button>
  )
}
