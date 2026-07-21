import { Search } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import type { FilterOption } from '@/utils/filterUtils'
import cn from '@/utils/cn'

interface FilterMenuProps {
  options: FilterOption[]
  selectedValues: string[]
  label?: string
  onChange: (values: string[]) => void
  onClear: () => void
}

export function CategoryFilterMenu({
  label,
  options,
  selectedValues,
  onChange,
  onClear,
}: FilterMenuProps) {
  const [search, setSearch] = useState('')

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase()),
  )

  const toggleValue = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value))
    } else {
      onChange([...selectedValues, value])
    }
  }

  return (
    <div className='flex w-64 flex-col bg-surface'>
      <div className='relative border-b border-border-default'>
        <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted' />
        <input
          className='w-full bg-transparent py-2.5 pr-3 pl-9 text-12 text-text-primary outline-none placeholder:text-text-muted'
          placeholder={label ? `Filter by ${label}...` : 'Search...'}
          type='text'
          value={search}
          autoFocus
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className='ez-scrollbar flex max-h-[220px] flex-col gap-0.5 overflow-y-auto p-2'>
        {filteredOptions.length === 0 ? (
          <div className='px-2 py-2 text-12 text-text-muted'>
            No options found.
          </div>
        ) : (
          filteredOptions.map((opt) => {
            const isSelected = selectedValues.includes(opt.value)
            return (
              <label
                key={opt.value}
                className={cn(
                  'flex cursor-pointer items-center justify-between rounded px-2.5 py-1.5 text-12 font-medium transition-colors hover:bg-gray-2',
                  isSelected && 'bg-primary-3/30 text-primary-9',
                )}
              >
                <div className='flex items-center gap-2'>
                  <input
                    checked={isSelected}
                    className='accent-primary-9'
                    type='checkbox'
                    onChange={() => toggleValue(opt.value)}
                  />
                  <span>{opt.label}</span>
                </div>
              </label>
            )
          })
        )}
      </div>

      {selectedValues.length > 0 && (
        <div className='p-2 pt-0'>
          <div className='mx-[-8px] mb-1 h-px bg-border-default' />
          <button
            className='w-full rounded px-2.5 py-1.5 text-left text-12 font-medium text-text-secondary hover:bg-gray-2'
            onClick={onClear}
          >
            Clear Selection
          </button>
        </div>
      )}
    </div>
  )
}

import { ArrowLeft } from 'lucide-react'
import InputDate from '@/components/base/inputs/InputDate'
import InputNumber from '@/components/base/inputs/InputNumber'

export function CustomRangeMenu({
  initialEnd = '',
  initialStart = '',
  type,
  onApply,
  onCancel,
}: {
  initialEnd?: string
  initialStart?: string
  type: 'number' | 'date'
  onApply: (start: string, end: string) => void
  onCancel: () => void
}) {
  const [start, setStart] = useState<string | number>(initialStart)
  const [end, setEnd] = useState<string | number>(initialEnd)

  useEffect(() => {
    setStart(initialStart)
    setEnd(initialEnd)
  }, [initialStart, initialEnd])

  const handleApply = () => {
    if (start !== '' && end !== '') {
      onApply(String(start), String(end))
    }
  }

  return (
    <div className='flex w-64 flex-col gap-3 bg-surface p-3'>
      <div className='flex items-center gap-2'>
        <button
          className='text-text-muted hover:text-text-primary'
          onClick={onCancel}
        >
          <ArrowLeft className='h-4 w-4' />
        </button>
        <span className='text-12 font-semibold text-text-primary'>
          Custom Range
        </span>
      </div>

      <div className='flex flex-col gap-2'>
        {type === 'number' ? (
          <>
            <InputNumber
              label='Min Amount'
              placeholder='0.00'
              value={start}
              onChange={setStart}
            />
            <InputNumber
              label='Max Amount'
              placeholder='0.00'
              value={end}
              onChange={setEnd}
            />
          </>
        ) : (
          <>
            <InputDate
              label='Start Date'
              popoverProps={{ zIndex: 50005 }}
              value={String(start)}
              onChange={(v) => setStart(v ?? '')}
            />
            <InputDate
              label='End Date'
              popoverProps={{ zIndex: 50005 }}
              value={String(end)}
              onChange={(v) => setEnd(v ?? '')}
            />
          </>
        )}
      </div>

      <button
        className='mt-2 w-full rounded bg-primary-9 py-1.5 text-12 font-medium text-white disabled:opacity-50'
        disabled={start === '' || end === ''}
        onClick={handleApply}
      >
        Apply
      </button>
    </div>
  )
}

export function DateFilterMenu({
  options,
  selectedValues,
  onChange,
  onClear,
}: FilterMenuProps) {
  const activeValue = selectedValues[0] || ''
  const isCustomActive = activeValue.startsWith('custom:')
  const [showCustom, setShowCustom] = useState(() => isCustomActive)
  const initialStart = isCustomActive
    ? activeValue.replace('custom:', '').split('_')[0]
    : ''
  const initialEnd = isCustomActive
    ? activeValue.replace('custom:', '').split('_')[1]
    : ''

  if (showCustom) {
    return (
      <CustomRangeMenu
        initialEnd={initialEnd}
        initialStart={initialStart}
        type='date'
        onApply={(start, end) => {
          onChange([`custom:${start}_${end}`])
          setShowCustom(false)
        }}
        onCancel={() => setShowCustom(false)}
      />
    )
  }

  return (
    <div className='flex w-56 flex-col gap-1 bg-surface p-2'>
      <div className='ez-scrollbar flex max-h-[220px] flex-col gap-0.5 overflow-y-auto'>
        {options.map((opt) => {
          const isSelected = selectedValues.includes(opt.value)

          if (opt.value === 'custom') {
            return (
              <button
                key={opt.value}
                className={cn(
                  'w-full cursor-pointer rounded px-2.5 py-1.5 text-left text-12 font-medium transition-colors hover:bg-gray-2',
                  isSelected
                    ? 'bg-primary-3/30 text-primary-9'
                    : 'text-text-primary',
                )}
                onClick={() => setShowCustom(true)}
              >
                {opt.label}
              </button>
            )
          }

          return (
            <label
              key={opt.value}
              className={cn(
                'flex cursor-pointer items-center justify-between rounded px-2.5 py-1.5 text-12 font-medium transition-colors hover:bg-gray-2',
                isSelected && 'bg-primary-3/30 text-primary-9',
              )}
            >
              <div className='flex items-center gap-2'>
                <input
                  checked={isSelected}
                  className='accent-primary-9'
                  type='checkbox'
                  onChange={() => {
                    if (isSelected) {
                      onChange(selectedValues.filter((v) => v !== opt.value))
                    } else {
                      onChange([...selectedValues, opt.value])
                    }
                  }}
                />
                <span>{opt.label}</span>
              </div>
            </label>
          )
        })}
      </div>

      {selectedValues.length > 0 && (
        <div className='p-2 pt-0'>
          <div className='mx-[-8px] mb-1 h-px bg-border-default' />
          <button
            className='w-full rounded px-2.5 py-1.5 text-left text-12 font-medium text-text-secondary hover:bg-gray-2'
            onClick={onClear}
          >
            Clear Selection
          </button>
        </div>
      )}
    </div>
  )
}

export function NumberFilterMenu({
  options,
  selectedValues,
  onChange,
  onClear,
}: FilterMenuProps) {
  const customValue = selectedValues.find((v) => v.startsWith('custom:'))
  const [showCustom, setShowCustom] = useState(() => Boolean(customValue))
  const initialStart = customValue
    ? customValue.replace('custom:', '').split('-')[0]
    : ''
  const initialEnd = customValue
    ? customValue.replace('custom:', '').split('-')[1]
    : ''

  if (showCustom) {
    return (
      <CustomRangeMenu
        initialEnd={initialEnd}
        initialStart={initialStart}
        type='number'
        onApply={(min, max) => {
          onChange([`custom:${min}-${max}`])
          setShowCustom(false)
        }}
        onCancel={() => setShowCustom(false)}
      />
    )
  }

  return (
    <div className='flex w-56 flex-col gap-1 bg-surface p-2'>
      <div className='ez-scrollbar flex max-h-[220px] flex-col gap-0.5 overflow-y-auto'>
        {options.map((opt) => {
          const isSelected = selectedValues.includes(opt.value)
          return (
            <label
              key={opt.value}
              className={cn(
                'flex cursor-pointer items-center justify-between rounded px-2.5 py-1.5 text-12 font-medium transition-colors hover:bg-gray-2',
                isSelected && 'bg-primary-3/30 text-primary-9',
              )}
            >
              <div className='flex items-center gap-2'>
                <input
                  checked={isSelected}
                  className='accent-primary-9'
                  type='checkbox'
                  onChange={() => {
                    if (isSelected) {
                      onChange(selectedValues.filter((v) => v !== opt.value))
                    } else {
                      onChange([...selectedValues, opt.value])
                    }
                  }}
                />
                <span>{opt.label}</span>
              </div>
            </label>
          )
        })}
        <button
          className='w-full cursor-pointer rounded px-2.5 py-1.5 text-left text-12 font-medium text-primary-9 transition-colors hover:bg-primary-3/50'
          onClick={() => setShowCustom(true)}
        >
          Custom Range...
        </button>
      </div>

      {selectedValues.length > 0 && (
        <>
          <div className='mx-[-8px] my-1 h-px bg-border-default' />
          <button
            className='w-full rounded px-2.5 py-1.5 text-left text-12 font-medium text-text-secondary hover:bg-gray-2'
            onClick={onClear}
          >
            Clear Selection
          </button>
        </>
      )}
    </div>
  )
}
