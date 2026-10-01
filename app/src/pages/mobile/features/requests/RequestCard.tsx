import type { ReactNode } from 'react'
import cn from '@/utils/cn'
import { Icon } from '../../components/primitives/Icon'

export type RequestCardData = {
  aiNote?: string
  amount: string
  id: string
  meta: string
  po?: string
  reference: string
  status: string
  statusTone: RequestCardTone
  vendor: string
}

export type RequestCardTone = 'error' | 'success' | 'warning' | 'accent'

const badgeClass: Record<RequestCardTone, string> = {
  accent: 'bg-[var(--primary-3)] text-[var(--primary-9)]',
  error: 'bg-[var(--red-3)] text-[var(--red-9)]',
  success: 'bg-[var(--green-3)] text-[var(--green-9)]',
  warning: 'bg-[var(--orange-3)] text-[var(--orange-9)]',
}

const iconToneClass: Record<RequestCardTone, string> = {
  accent: 'bg-[var(--primary-3)] text-[var(--primary-9)]',
  error: 'bg-[var(--red-3)] text-[var(--red-9)]',
  success: 'bg-[var(--green-3)] text-[var(--green-9)]',
  warning: 'bg-[var(--orange-3)] text-[var(--orange-9)]',
}

type FilterChipProps = {
  active?: boolean
  count: number
  icon: ReactNode
  label: string
  tone?: RequestCardTone
  onClick?: () => void
}

type RequestCardProps = {
  index?: number
  item: RequestCardData
  onSelect?: (id: string) => void
}

export function RequestCard({ index = 0, item, onSelect }: RequestCardProps) {
  return (
    <button
      type='button'
      className={cn(
        'w-full rounded-[5px] border border-[var(--gray-3)] bg-surface-primary px-3.5 py-3 text-left shadow-[0_2px_8px_rgba(15,23,42,0.08)] transition-all',
        'animate-in fade-in slide-in-from-bottom-2 duration-300 active:scale-[0.99]',
      )}
      style={{
        animationDelay: `${Math.min(index, 8) * 35}ms`,
        animationFillMode: 'both',
      }}
      onClick={() => onSelect?.(item.id)}
    >
      <div className='flex items-start gap-2.5'>
        <span
          className={cn(
            'inline-flex size-9 shrink-0 items-center justify-center rounded-xl',
            iconToneClass[item.statusTone],
          )}
        >
          <Icon className='size-4' name='FileText' />
        </span>

        <div className='min-w-0 flex-1'>
          {/* Row 1: invoice | amount */}
          <div className='flex items-start justify-between gap-3'>
            <p className='min-w-0 truncate text-[13px] leading-tight font-semibold text-[var(--gray-13)]'>
              {item.reference}
            </p>
            <p className='shrink-0 text-right text-[13px] leading-tight font-bold text-[var(--gray-13)] tabular-nums'>
              {item.amount}
            </p>
          </div>

          {/* Row 2: PO | status badge */}
          <div className='mt-1 flex items-center justify-between gap-3'>
            <p className='min-w-0 truncate text-[11px] leading-tight text-[var(--gray-9)]'>
              {item.po || item.vendor}
            </p>
            <span
              className={cn(
                'inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] leading-none font-semibold',
                badgeClass[item.statusTone],
              )}
            >
              {item.status}
            </span>
          </div>
        </div>
      </div>

      <div className='mt-3 flex items-center justify-between border-t border-[var(--gray-3)] pt-2.5'>
        <span className='inline-flex min-w-0 items-center gap-1 text-[11px] text-[var(--gray-9)]'>
          <Icon className='size-3 shrink-0' name='Calendar' />
          <span className='truncate'>
            {item.meta && item.meta !== '—' ? item.meta : 'No due date'}
          </span>
        </span>
        <span className='inline-flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-[var(--primary-9)]'>
          See Details
          <Icon className='size-3.5' name='ChevronRight' />
        </span>
      </div>
    </button>
  )
}

const filterIdleClass: Record<RequestCardTone, string> = {
  accent: 'bg-surface text-[var(--gray-11)]',
  error: 'bg-surface text-[var(--red-9)]',
  success: 'bg-surface text-[var(--gray-11)]',
  warning: 'bg-surface text-[var(--gray-11)]',
}

export function FilterChip({
  active,
  count,
  icon,
  label,
  tone = 'accent',
  onClick,
}: FilterChipProps) {
  return (
    <button
      type='button'
      className={cn(
        'inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[11px] font-medium transition-all active:scale-95',
        active
          ? 'bg-[var(--primary-9)] font-semibold text-white'
          : filterIdleClass[tone],
      )}
      onClick={onClick}
    >
      <span className={cn(active ? 'text-white' : undefined)}>{icon}</span>
      <span>
        {label} ({count})
      </span>
    </button>
  )
}

export function RequestCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
      className={cn(
        'rounded-[5px] border border-[var(--gray-3)] bg-surface-primary px-3.5 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.08)]',
        'animate-in fade-in slide-in-from-bottom-2 duration-300',
      )}
    >
      <div className='flex items-start gap-2.5'>
        <div className='size-9 animate-pulse rounded-xl bg-[var(--gray-3)]' />
        <div className='min-w-0 flex-1 space-y-2'>
          <div className='flex justify-between gap-3'>
            <div className='h-3 w-20 animate-pulse rounded bg-[var(--gray-3)]' />
            <div className='h-3 w-16 animate-pulse rounded bg-[var(--gray-3)]' />
          </div>
          <div className='flex justify-between gap-3'>
            <div className='h-2.5 w-16 animate-pulse rounded bg-[var(--gray-3)]' />
            <div className='h-4 w-14 animate-pulse rounded-full bg-[var(--gray-3)]' />
          </div>
        </div>
      </div>
      <div className='mt-3 border-t border-[var(--gray-3)] pt-2.5'>
        <div className='h-2.5 w-28 animate-pulse rounded bg-[var(--gray-3)]' />
      </div>
    </div>
  )
}
