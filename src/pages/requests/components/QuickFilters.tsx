import React from 'react'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'
import requestStore from '../stores/useRequestStore'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import MenuSub from '@/components/base/menu/MenuSub'

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

  const handleAddCustomFilter = (field: string, value: string) => {
    const filterId = `${field}:${value}`
    if (!activeQuickFilters.includes(filterId)) {
      toggleQuickFilter(filterId)
    }
  }

  return (
    <div className='flex flex-col gap-2 border-b border-[var(--gray-2)] bg-surface/50 py-2 pr-4 pl-7 backdrop-blur-sm select-none w-full'>
      <div className='flex flex-wrap items-center gap-2'>
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

        {/* Custom Active Filters */}
        {activeQuickFilters.map((f) => {
          if (['overdue', 'matched', 'discrepancies', 'highValue'].includes(f)) return null

          const [field, val] = f.split(':')
          let label = ''
          if (field === 'status') {
            label = `Status: ${val}`
          } else if (field === 'amount') {
            const amountLabels: Record<string, string> = {
              lt1k: '< $1k',
              '1k_5k': '$1k - $5k',
              '5k_10k': '$5k - $10k',
              ge10k: '≥ $10k',
            }
            label = `Amount: ${amountLabels[val] || val}`
          }

          return (
            <button
              key={f}
              className='flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-all duration-200 active:scale-95 bg-[var(--purple-2)] border-[var(--purple-5)] text-[var(--purple-11)] hover:bg-[var(--purple-3)]'
              onClick={() => toggleQuickFilter(f)}
            >
              <Icon className='size-3.5' name='tabler:filter' />
              <span>{label}</span>
              <Icon className='size-3 text-[var(--purple-9)] font-bold' name='tabler:x' />
            </button>
          )
        })}

        {/* Add Filter Menu */}
        <Menu
          target={
            <button
              className={cn(
                'flex cursor-pointer items-center gap-1 rounded-full border border-dashed px-3 py-1 text-[11px] font-semibold transition-all duration-200 active:scale-95',
                'border-[var(--gray-4)] text-[var(--gray-10)] hover:border-[var(--gray-6)] hover:bg-[var(--gray-2)]',
              )}
            >
              <Icon className='size-3.5' name='tabler:plus' />
              <span>Add Filter</span>
            </button>
          }
          width={180}
        >
          <MenuSub label="Request Status" icon="tabler:circle-dot">
            {['Approved', 'Partially Approved', 'Rejected'].map((statusVal) => (
              <MenuItem
                key={statusVal}
                label={statusVal}
                onClick={() => handleAddCustomFilter('status', statusVal)}
              />
            ))}
          </MenuSub>
          <MenuSub label="PO Amount" icon="tabler:currency-dollar">
            {[
              { label: '< $1k', val: 'lt1k' },
              { label: '$1k - $5k', val: '1k_5k' },
              { label: '$5k - $10k', val: '5k_10k' },
              { label: '≥ $10k', val: 'ge10k' },
            ].map((amountOpt) => (
              <MenuItem
                key={amountOpt.val}
                label={amountOpt.label}
                onClick={() => handleAddCustomFilter('amount', amountOpt.val)}
              />
            ))}
          </MenuSub>
        </Menu>

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
    </div>
  )
}

export default QuickFilters
