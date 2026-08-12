import React, { useMemo, useState } from 'react'
import { useLingui } from '@lingui/react/macro'
import Icon from '@/components/base/icon/Icon'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import MenuSub from '@/components/base/menu/MenuSub'
import cn from '@/utils/cn'
import requestStore from '../stores/useRequestStore'

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
  const agentData =
    row?._agentResponse || row?._agentData?.[0] || row?._agentData || {}

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
  const { t } = useLingui()
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

  const statuses = useMemo(
    () => [
      { label: t`Approved`, value: 'Approved' },
      { label: t`Partially Approved`, value: 'Partially Approved' },
      { label: t`Rejected`, value: 'Rejected' },
    ],
    [t],
  )
  const filteredStatuses = useMemo(() => {
    return statuses.filter((statusOpt) =>
      statusOpt.label.toLowerCase().includes(statusSearch.toLowerCase()),
    )
  }, [statusSearch, statuses])

  const poAmounts = useMemo(
    () => [
      { label: t`< $1k`, val: 'lt1k' },
      { label: t`$1k - $5k`, val: '1k_5k' },
      { label: t`$5k - $10k`, val: '5k_10k' },
      { label: t`≥ $10k`, val: 'ge10k' },
    ],
    [t],
  )
  const filteredPoAmounts = useMemo(() => {
    return poAmounts.filter((opt) =>
      opt.label.toLowerCase().includes(poSearch.toLowerCase()),
    )
  }, [poAmounts, poSearch])

  const filteredSuppliers = useMemo(() => {
    return supplierNames.filter((name) =>
      name.toLowerCase().includes(supplierSearch.toLowerCase()),
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
      label: t`Overdue`,
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
      label: t`Matched`,
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
      label: t`Discrepancies`,
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
      label: t`High Value (≥$10k)`,
    },
  ]

  const handleAddCustomFilter = (field: string, value: string) => {
    const filterId = `${field}:${value}`
    if (!activeQuickFilters.includes(filterId)) {
      toggleQuickFilter(filterId)
    }
  }

  return (
    <div className='flex w-full flex-col gap-2 border-b border-[var(--gray-2)] bg-surface/50 py-2 pr-4 pl-7 backdrop-blur-sm select-none'>
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
          if (['overdue', 'matched', 'discrepancies', 'highValue'].includes(f))
            return null

          const [field, val] = f.split(':')
          let label = ''
          if (field === 'status') {
            label = t`Status: ${val}`
          } else if (field === 'amount') {
            const amountLabels: Record<string, string> = {
              '1k_5k': t`$1k - $5k`,
              '5k_10k': t`$5k - $10k`,
              'ge10k': t`≥ $10k`,
              'lt1k': t`< $1k`,
            }
            label = t`Amount: ${amountLabels[val] || val}`
          } else if (field === 'supplier') {
            label = t`Supplier: ${val}`
          }

          return (
            <div
              className='flex items-center gap-1.5 rounded-full border border-[var(--purple-5)] bg-[var(--purple-2)] px-3 py-1 text-[11px] font-semibold text-[var(--purple-11)] transition-all duration-200 hover:bg-[var(--purple-3)]'
              key={f}
            >
              <Icon className='size-3.5' name='tabler:filter' />
              <span>{label}</span>
              <button
                aria-label={t`Remove ${label} filter`}
                className='flex cursor-pointer items-center justify-center rounded-full border-none bg-transparent p-0 text-[var(--purple-9)] active:scale-95'
                type='button'
                onClick={(e) => {
                  e.stopPropagation()
                  toggleQuickFilter(f)
                }}
              >
                <Icon className='size-3 font-bold' name='tabler:x' />
              </button>
            </div>
          )
        })}

        {/* Add Filter Menu */}
        <Menu
          width={220}
          target={
            <button
              className={cn(
                'flex cursor-pointer items-center gap-1 rounded-full border border-dashed px-3 py-1 text-[11px] font-semibold transition-all duration-200 active:scale-95',
                'border-[var(--gray-4)] text-[var(--gray-10)] hover:border-[var(--gray-6)] hover:bg-[var(--gray-2)]',
              )}
            >
              <Icon className='size-3.5' name='tabler:plus' />
              <span>{t`Add Filter`}</span>
            </button>
          }
        >
          <MenuSub icon='tabler:circle-dot' label={t`Request Status`} width={200}>
            {/* Search Box */}
            <div
              className='border-b border-[var(--gray-3)] px-2 py-1.5'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='relative flex items-center'>
                <Icon
                  className='absolute left-2.5 size-3.5 text-[var(--gray-9)]'
                  name='tabler:search'
                />
                <input
                  className='w-full rounded border border-[var(--gray-3)] bg-surface py-1 pr-2 pl-8 text-xs font-medium text-[var(--text-primary)] outline-none focus:border-[var(--primary-9)]'
                  placeholder={t`Search status...`}
                  type='text'
                  value={statusSearch}
                  onChange={(e) => setStatusSearch(e.target.value)}
                />
                {statusSearch && (
                  <button
                    className='absolute right-2 cursor-pointer border-none bg-transparent text-[var(--gray-9)] hover:text-[var(--gray-12)]'
                    onClick={() => setStatusSearch('')}
                  >
                    <Icon className='size-3' name='tabler:x' />
                  </button>
                )}
              </div>
            </div>
            {filteredStatuses.length === 0 ? (
              <div className='px-3 py-2 text-center text-xs text-[var(--gray-9)]'>
                {t`No results found`}
              </div>
            ) : (
              filteredStatuses.map((statusOpt) => (
                <MenuItem
                  key={statusOpt.value}
                  label={statusOpt.label}
                  onClick={() =>
                    handleAddCustomFilter('status', statusOpt.value)
                  }
                />
              ))
            )}
          </MenuSub>
          <MenuSub icon='tabler:currency-dollar' label={t`PO Amount`} width={200}>
            {/* Search Box */}
            <div
              className='border-b border-[var(--gray-3)] px-2 py-1.5'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='relative flex items-center'>
                <Icon
                  className='absolute left-2.5 size-3.5 text-[var(--gray-9)]'
                  name='tabler:search'
                />
                <input
                  className='w-full rounded border border-[var(--gray-3)] bg-surface py-1 pr-2 pl-8 text-xs font-medium text-[var(--text-primary)] outline-none focus:border-[var(--primary-9)]'
                  placeholder={t`Search PO range...`}
                  type='text'
                  value={poSearch}
                  onChange={(e) => setPoSearch(e.target.value)}
                />
                {poSearch && (
                  <button
                    className='absolute right-2 cursor-pointer border-none bg-transparent text-[var(--gray-9)] hover:text-[var(--gray-12)]'
                    onClick={() => setPoSearch('')}
                  >
                    <Icon className='size-3' name='tabler:x' />
                  </button>
                )}
              </div>
            </div>
            {filteredPoAmounts.length === 0 ? (
              <div className='px-3 py-2 text-center text-xs text-[var(--gray-9)]'>
                {t`No results found`}
              </div>
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
          <MenuSub icon='tabler:building' label={t`Supplier`} width={240}>
            {/* Search Box */}
            <div
              className='border-b border-[var(--gray-3)] px-2 py-1.5'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='relative flex items-center'>
                <Icon
                  className='absolute left-2.5 size-3.5 text-[var(--gray-9)]'
                  name='tabler:search'
                />
                <input
                  className='w-full rounded border border-[var(--gray-3)] bg-surface py-1 pr-2 pl-8 text-xs font-medium text-[var(--text-primary)] outline-none focus:border-[var(--primary-9)]'
                  placeholder={t`Search suppliers...`}
                  type='text'
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                />
                {supplierSearch && (
                  <button
                    className='absolute right-2 cursor-pointer border-none bg-transparent text-[var(--gray-9)] hover:text-[var(--gray-12)]'
                    onClick={() => setSupplierSearch('')}
                  >
                    <Icon className='size-3' name='tabler:x' />
                  </button>
                )}
              </div>
            </div>
            <div className='scrollbar max-h-60 overflow-y-auto'>
              {filteredSuppliers.length === 0 ? (
                <div className='px-3 py-2 text-center text-xs text-[var(--gray-9)]'>
                  {t`No suppliers found`}
                </div>
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
            <span>{t`Clear all`}</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default QuickFilters
