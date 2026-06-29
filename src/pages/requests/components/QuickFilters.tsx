import React from 'react'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'
import requestStore from '../stores/useRequestStore'

interface QuickFiltersProps {
  counts: {
    discrepancies: number
    highValue: number
    matched: number
    overdue: number
  }
}

const QuickFilters: React.FC<QuickFiltersProps> = ({ counts }) => {
  const { activeQuickFilters, toggleQuickFilter } = requestStore()

  const filters = [
    {
      activeBadgeClass: 'bg-[var(--red-9)] text-white',
      activeClass:
        'bg-[var(--red-2)] border-[var(--red-5)] text-[var(--red-11)] hover:bg-[var(--red-3)]',
      count: counts.overdue,
      icon: 'tabler:clock',
      id: 'overdue',
      inactiveBadgeClass: 'bg-[var(--gray-3)] text-[var(--gray-11)]',
      inactiveClass:
        'bg-[var(--gray-1)] border-[var(--gray-3)] text-[var(--gray-10)] hover:bg-[var(--gray-2)] hover:text-[var(--gray-12)]',
      label: 'Overdue',
    },
    {
      activeBadgeClass: 'bg-[var(--green-9)] text-white',
      activeClass:
        'bg-[var(--green-2)] border-[var(--green-5)] text-[var(--green-11)] hover:bg-[var(--green-3)]',
      count: counts.matched,
      icon: 'tabler:circle-check',
      id: 'matched',
      inactiveBadgeClass: 'bg-[var(--gray-3)] text-[var(--gray-11)]',
      inactiveClass:
        'bg-[var(--gray-1)] border-[var(--gray-3)] text-[var(--gray-10)] hover:bg-[var(--gray-2)] hover:text-[var(--gray-12)]',
      label: 'Auto-Matched',
    },
    {
      activeBadgeClass: 'bg-[var(--orange-9)] text-white',
      activeClass:
        'bg-[var(--orange-2)] border-[var(--orange-5)] text-[var(--orange-11)] hover:bg-[var(--orange-3)]',
      count: counts.discrepancies,
      icon: 'tabler:alert-triangle',
      id: 'discrepancies',
      inactiveBadgeClass: 'bg-[var(--gray-3)] text-[var(--gray-11)]',
      inactiveClass:
        'bg-[var(--gray-1)] border-[var(--gray-3)] text-[var(--gray-10)] hover:bg-[var(--gray-2)] hover:text-[var(--gray-12)]',
      label: 'Discrepancies',
    },
    {
      activeBadgeClass: 'bg-[var(--blue-9)] text-white',
      activeClass:
        'bg-[var(--blue-2)] border-[var(--blue-5)] text-[var(--blue-11)] hover:bg-[var(--blue-3)]',
      count: counts.highValue,
      icon: 'tabler:currency-dollar',
      id: 'highValue',
      inactiveBadgeClass: 'bg-[var(--gray-3)] text-[var(--gray-11)]',
      inactiveClass:
        'bg-[var(--gray-1)] border-[var(--gray-3)] text-[var(--gray-10)] hover:bg-[var(--gray-2)] hover:text-[var(--gray-12)]',
      label: 'High Value (≥$10k)',
    },
  ]

  return (
    <div className='flex flex-wrap items-center gap-2 border-b border-[var(--gray-2)] bg-surface/50 py-2 pr-4 pl-7 backdrop-blur-sm select-none'>
      {filters.map((f) => {
        const isActive = activeQuickFilters.includes(f.id)
        return (
          <button
            key={f.id}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-all duration-200 active:scale-95',
              isActive ? f.activeClass : f.inactiveClass,
            )}
            onClick={() => toggleQuickFilter(f.id)}
          >
            <Icon className='size-3.5' name={f.icon} />
            <span>{f.label}</span>
            <span
              className={cn(
                'flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] leading-none font-bold',
                isActive ? f.activeBadgeClass : f.inactiveBadgeClass,
              )}
            >
              {f.count}
            </span>
          </button>
        )
      })}
      {activeQuickFilters.length > 0 && (
        <button
          className='ml-auto flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[var(--gray-9)] hover:text-[var(--gray-12)] hover:underline'
          onClick={() => requestStore.getState().clearQuickFilters()}
        >
          <Icon className='size-3' name='tabler:x' />
          <span>Clear all</span>
        </button>
      )}
    </div>
  )
}

export default QuickFilters
