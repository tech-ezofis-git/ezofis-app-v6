import React, { useState, useMemo } from 'react'
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
  data?: any[]
}

const findSupplierName = (row: any): string | null => {
  if (!row) return null
  const parsedForm = row?.parsedForm || {}
  const agentData = row?._agentResponse || row?._agentData?.[0] || row?._agentData || {}

  const directKeys = [
    'UtfgJy6Z0qyfRC5Bclfc',
    'UtfgJy6Z0qyfRC5Bclf-c',
    'UtfgJy6Z0qyfRC5Bclf_c',
    'supplierName',
    'Supplier Name',
    'Vendor Name',
    'vendorName',
    'vendor',
    'raisedBy',
  ]

  for (const key of directKeys) {
    if (row[key] !== undefined && row[key] !== null) {
      const val = String(row[key]).trim()
      if (val !== '' && val !== '-') return val
    }
    if (parsedForm[key] !== undefined && parsedForm[key] !== null) {
      const val = String(parsedForm[key]).trim()
      if (val !== '' && val !== '-') return val
    }
    if (agentData[key] !== undefined && agentData[key] !== null) {
      const val = String(agentData[key]).trim()
      if (val !== '' && val !== '-') return val
    }
  }

  const invoiceHeader = agentData?.['Extracted Invoice JSON']?.invoice_header
  if (invoiceHeader) {
    for (const key of directKeys) {
      if (invoiceHeader[key] !== undefined && invoiceHeader[key] !== null) {
        const val = String(invoiceHeader[key]).trim()
        if (val !== '' && val !== '-') return val
      }
    }
  }

  return null
}

const QuickFilters: React.FC<QuickFiltersProps> = ({ counts, data }) => {
  const { activeQuickFilters, toggleQuickFilter } = requestStore()

  const [statusSearch, setStatusSearch] = useState('')
  const [poSearch, setPoSearch] = useState('')
  const [supplierSearch, setSupplierSearch] = useState('')

  const supplierNames = useMemo(() => {
    if (!data) return []
    const set = new Set<string>()
    data.forEach((row: any) => {
      const name = findSupplierName(row)
      if (name && name !== 'Unknown Supplier') {
        set.add(name)
      }
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [data])

  const statuses = ['Approved', 'Partially Approved', 'Rejected']
  const filteredStatuses = useMemo(() => {
    return statuses.filter((statusVal) =>
      statusVal.toLowerCase().includes(statusSearch.toLowerCase())
    )
  }, [statusSearch])

  const poAmounts = [
    { label: '< $1k', val: 'lt1k' },
    { label: '$1k - $5k', val: '1k_5k' },
    { label: '$5k - $10k', val: '5k_10k' },
    { label: '≥ $10k', val: 'ge10k' },
  ]
  const filteredPoAmounts = useMemo(() => {
    return poAmounts.filter((opt) =>
      opt.label.toLowerCase().includes(poSearch.toLowerCase())
    )
  }, [poSearch])

  const filteredSuppliers = useMemo(() => {
    return supplierNames.filter((name) =>
      name.toLowerCase().includes(supplierSearch.toLowerCase())
    )
  }, [supplierNames, supplierSearch])

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
          } else if (field === 'supplier') {
            label = `Supplier: ${val}`
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
          width={220}
        >
          <MenuSub label="Request Status" icon="tabler:circle-dot" width={200}>
            {/* Search Box */}
            <div className='px-2 py-1.5 border-b border-[var(--gray-3)]' onClick={(e) => e.stopPropagation()}>
              <div className='relative flex items-center'>
                <Icon className='absolute left-2.5 size-3.5 text-[var(--gray-9)]' name='tabler:search' />
                <input
                  type='text'
                  placeholder='Search status...'
                  value={statusSearch}
                  onChange={(e) => setStatusSearch(e.target.value)}
                  className='w-full rounded border border-[var(--gray-3)] pl-8 pr-2 py-1 text-xs outline-none bg-surface focus:border-[var(--primary-9)] font-medium text-[var(--text-primary)]'
                />
                {statusSearch && (
                  <button
                    onClick={() => setStatusSearch('')}
                    className='absolute right-2 text-[var(--gray-9)] hover:text-[var(--gray-12)] border-none bg-transparent cursor-pointer'
                  >
                    <Icon className='size-3' name='tabler:x' />
                  </button>
                )}
              </div>
            </div>
            {filteredStatuses.length === 0 ? (
              <div className='px-3 py-2 text-xs text-[var(--gray-9)] text-center'>No results found</div>
            ) : (
              filteredStatuses.map((statusVal) => (
                <MenuItem
                  key={statusVal}
                  label={statusVal}
                  onClick={() => handleAddCustomFilter('status', statusVal)}
                />
              ))
            )}
          </MenuSub>
          <MenuSub label="PO Amount" icon="tabler:currency-dollar" width={200}>
            {/* Search Box */}
            <div className='px-2 py-1.5 border-b border-[var(--gray-3)]' onClick={(e) => e.stopPropagation()}>
              <div className='relative flex items-center'>
                <Icon className='absolute left-2.5 size-3.5 text-[var(--gray-9)]' name='tabler:search' />
                <input
                  type='text'
                  placeholder='Search PO range...'
                  value={poSearch}
                  onChange={(e) => setPoSearch(e.target.value)}
                  className='w-full rounded border border-[var(--gray-3)] pl-8 pr-2 py-1 text-xs outline-none bg-surface focus:border-[var(--primary-9)] font-medium text-[var(--text-primary)]'
                />
                {poSearch && (
                  <button
                    onClick={() => setPoSearch('')}
                    className='absolute right-2 text-[var(--gray-9)] hover:text-[var(--gray-12)] border-none bg-transparent cursor-pointer'
                  >
                    <Icon className='size-3' name='tabler:x' />
                  </button>
                )}
              </div>
            </div>
            {filteredPoAmounts.length === 0 ? (
              <div className='px-3 py-2 text-xs text-[var(--gray-9)] text-center'>No results found</div>
            ) : (
              filteredPoAmounts.map((amountOpt) => (
                <MenuItem
                  key={amountOpt.val}
                  label={amountOpt.label}
                  onClick={() => handleAddCustomFilter('amount', amountOpt.val)}
                />
              ))
            )}
          </MenuSub>
          <MenuSub label="Supplier" icon="tabler:building" width={240}>
            {/* Search Box */}
            <div className='px-2 py-1.5 border-b border-[var(--gray-3)]' onClick={(e) => e.stopPropagation()}>
              <div className='relative flex items-center'>
                <Icon className='absolute left-2.5 size-3.5 text-[var(--gray-9)]' name='tabler:search' />
                <input
                  type='text'
                  placeholder='Search suppliers...'
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                  className='w-full rounded border border-[var(--gray-3)] pl-8 pr-2 py-1 text-xs outline-none bg-surface focus:border-[var(--primary-9)] font-medium text-[var(--text-primary)]'
                />
                {supplierSearch && (
                  <button
                    onClick={() => setSupplierSearch('')}
                    className='absolute right-2 text-[var(--gray-9)] hover:text-[var(--gray-12)] border-none bg-transparent cursor-pointer'
                  >
                    <Icon className='size-3' name='tabler:x' />
                  </button>
                )}
              </div>
            </div>
            <div className='max-h-60 overflow-y-auto scrollbar'>
              {filteredSuppliers.length === 0 ? (
                <div className='px-3 py-2 text-xs text-[var(--gray-9)] text-center'>No suppliers found</div>
              ) : (
                filteredSuppliers.map((name) => (
                  <MenuItem
                    key={name}
                    label={name}
                    onClick={() => handleAddCustomFilter('supplier', name)}
                  />
                ))
              )}
            </div>
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
