import { ChevronRight, Search } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import InputDate from '@/components/base/inputs/InputDate'
import InputNumber from '@/components/base/inputs/InputNumber'
import type { FilterOption } from '@/utils/filterUtils'
import cn from '@/utils/cn'

interface FilterMenuProps {
  options: FilterOption[]
  selectedValues: string[]
  label?: string
  /** Dynamic lists only — hide for fixed date/amount preset lists */
  showCount?: boolean
  showSearch?: boolean
  onChange: (values: string[]) => void
  onClear: () => void
}

const formatDisplayDate = (value: string) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const parseCustomDateRange = (value: string) => {
  if (!value.startsWith('custom:')) return { end: '', start: '' }
  const [start = '', end = ''] = value.replace('custom:', '').split('_')
  return { end, start }
}

export function CategoryFilterMenu({
  label: _label,
  options,
  selectedValues,
  showCount = true,
  showSearch = true,
  onChange,
  onClear,
}: FilterMenuProps) {
  const [search, setSearch] = useState('')

  const filteredOptions = options.filter((opt) =>
    !showSearch || !search
      ? true
      : opt.label.toLowerCase().includes(search.toLowerCase()),
  )

  const toggleValue = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value))
    } else {
      onChange([...selectedValues, value])
    }
  }

  return (
    <div className='flex w-max max-w-64 flex-col overflow-hidden bg-surface'>
      {showSearch ? (
        <div className='relative border-b border-border-default'>
          <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted' />
          <input
            className='w-full min-w-0 bg-transparent py-2.5 pr-3 pl-9 text-12 text-text-primary outline-none placeholder:text-text-muted'
            placeholder='Search...'
            type='text'
            value={search}
            autoFocus
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      ) : null}

      <div className='ez-scrollbar flex max-h-[220px] w-full flex-col gap-0.5 overflow-y-auto p-2'>
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
                  'group flex w-full max-w-full min-w-0 cursor-pointer items-start gap-2 rounded px-2.5 py-1.5 text-12 font-normal transition-colors hover:bg-gray-2',
                  isSelected && 'bg-primary-3/30 text-primary-9',
                )}
              >
                <input
                  checked={isSelected}
                  className='accent-primary-9 mt-0.5 shrink-0'
                  type='checkbox'
                  onChange={() => toggleValue(opt.value)}
                />
                <span className='block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap group-hover:whitespace-normal group-hover:break-words'>
                  {/^all(\s|$)/i.test(opt.label) ? 'All' : opt.label}
                </span>
              </label>
            )
          })
        )}
      </div>

      <div
        className={cn(
          'flex w-full items-center gap-2 border-t border-border-default px-2.5 py-2',
          showCount ? 'justify-between' : 'justify-start',
        )}
      >
        <button
          className={cn(
            'cursor-pointer text-12 font-normal whitespace-nowrap transition-colors',
            selectedValues.length > 0
              ? 'text-text-secondary hover:text-text-primary hover:underline'
              : 'cursor-default text-text-muted',
          )}
          disabled={selectedValues.length === 0}
          type='button'
          onClick={onClear}
        >
          Clear selection
        </button>
        {showCount ? (
          <span className='text-11 whitespace-nowrap text-text-muted'>
            {filteredOptions.length} of {options.length}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export function CustomRangeMenu({
  initialEnd = '',
  initialStart = '',
  type,
  onApply,
  onCancel,
  onClear,
}: {
  initialEnd?: string
  initialStart?: string
  type: 'number' | 'date'
  onApply: (start: string, end: string) => void
  onCancel: () => void
  onClear?: () => void
}) {
  const [start, setStart] = useState<string | number>(initialStart)
  const [end, setEnd] = useState<string | number>(initialEnd)

  useEffect(() => {
    setStart(initialStart)
    setEnd(initialEnd)
  }, [initialStart, initialEnd])

  const startStr = String(start ?? '').trim()
  const endStr = String(end ?? '').trim()
  const canApply = Boolean(startStr && endStr)
  const hasValue = Boolean(startStr || endStr || initialStart || initialEnd)

  return (
    <div className='flex w-52 flex-col gap-3 bg-surface p-3'>
      <div className='text-12 font-semibold text-text-primary'>Custom Range</div>

      <div className='flex flex-col gap-2'>
        {type === 'number' ? (
          <>
            <InputNumber
              label='Min'
              placeholder='0.00'
              value={start}
              onChange={setStart}
            />
            <InputNumber
              label='Max'
              placeholder='0.00'
              value={end}
              onChange={setEnd}
            />
          </>
        ) : (
          <>
            <InputDate
              clearable
              label='Start Date'
              placeholder='dd-mmm-yyyy'
              popoverProps={{ zIndex: 50005 }}
              value={startStr || null}
              onChange={(v) => setStart(v ?? '')}
            />
            <InputDate
              clearable
              label='End Date'
              placeholder='dd-mmm-yyyy'
              popoverProps={{ zIndex: 50005 }}
              value={endStr || null}
              onChange={(v) => setEnd(v ?? '')}
            />
          </>
        )}
      </div>

      <div className='flex items-center gap-2'>
        <button
          className='cursor-pointer px-1 text-12 font-medium text-text-secondary transition-colors hover:text-text-primary hover:underline'
          type='button'
          onClick={onCancel}
        >
          Cancel
        </button>
        {hasValue && onClear && (
          <button
            className='cursor-pointer px-1 text-12 font-medium text-text-secondary transition-colors hover:text-text-primary hover:underline'
            type='button'
            onClick={() => {
              setStart('')
              setEnd('')
              onClear()
            }}
          >
            Reset
          </button>
        )}
        <button
          className='flex-1 rounded bg-primary-9 py-1.5 text-12 font-medium text-white disabled:opacity-50'
          disabled={!canApply}
          type='button'
          onClick={() => {
            if (!canApply) return
            onApply(startStr, endStr)
          }}
        >
          Apply
        </button>
      </div>
    </div>
  )
}

export function DateFilterMenu({
  options,
  selectedValues,
  onChange,
  onClear,
}: FilterMenuProps) {
  const customSelected = selectedValues.find((v) => v.startsWith('custom:'))
  const [showCustom, setShowCustom] = useState(() => Boolean(customSelected))
  const { end: initialEnd, start: initialStart } = parseCustomDateRange(
    customSelected || '',
  )
  const activePreset = selectedValues.find((v) => !v.startsWith('custom:'))

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
        onClear={() => {
          onClear()
          setShowCustom(false)
        }}
      />
    )
  }

  return (
    <div className='flex w-max max-w-64 flex-col overflow-hidden bg-surface'>
      <div className='ez-scrollbar flex max-h-[240px] w-full flex-col gap-0.5 overflow-y-auto p-2'>
        {options.map((opt) => {
          const isCustom = opt.value === 'custom'
          const isSelected = isCustom
            ? Boolean(customSelected)
            : activePreset === opt.value
          const optionLabel =
            isCustom && customSelected
              ? `${formatDisplayDate(initialStart)} – ${formatDisplayDate(initialEnd)}`
              : opt.label

          return (
            <button
              key={opt.value}
              type='button'
              className={cn(
                'group flex w-full max-w-full min-w-0 cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-1.5 text-left text-12 font-normal transition-colors hover:bg-gray-2',
                isSelected
                  ? 'bg-primary-3/40 text-primary-9'
                  : 'text-text-primary',
              )}
              onClick={() => {
                if (isCustom) {
                  setShowCustom(true)
                  return
                }
                onChange([opt.value])
              }}
            >
              <span
                className={cn(
                  'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border',
                  isSelected
                    ? 'border-primary-9 bg-primary-9'
                    : 'border-border-default bg-surface',
                )}
              >
                {isSelected && (
                  <span className='h-1.5 w-1.5 rounded-full bg-white' />
                )}
              </span>
              <span className='block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap group-hover:whitespace-normal group-hover:break-words'>
                {/^all(\s|$)/i.test(optionLabel) ? 'All' : optionLabel}
              </span>
              {isCustom && (
                <ChevronRight className='h-3.5 w-3.5 shrink-0 opacity-50' />
              )}
            </button>
          )
        })}
      </div>

      <div className='flex items-center border-t border-border-default px-2.5 py-2'>
        <button
          className={cn(
            'cursor-pointer text-12 font-normal whitespace-nowrap transition-colors',
            selectedValues.length > 0
              ? 'text-text-secondary hover:text-text-primary hover:underline'
              : 'cursor-default text-text-muted',
          )}
          disabled={selectedValues.length === 0}
          type='button'
          onClick={onClear}
        >
          Clear selection
        </button>
      </div>
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
  const selectedPresets = selectedValues.filter((v) => !v.startsWith('custom:'))

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
        onClear={() => {
          onClear()
          setShowCustom(false)
        }}
      />
    )
  }

  const togglePreset = (value: string) => {
    const withoutCustom = selectedPresets.filter((v) => v !== value)
    if (selectedPresets.includes(value)) {
      onChange(withoutCustom)
      return
    }
    onChange([...withoutCustom, value])
  }

  return (
    <div className='flex w-max max-w-64 flex-col overflow-hidden bg-surface'>
      <div className='ez-scrollbar flex max-h-[240px] w-full flex-col gap-0.5 overflow-y-auto p-2'>
        {options.map((opt) => {
          const isCustom = opt.value === 'custom'
          const isSelected = isCustom
            ? Boolean(customValue)
            : selectedPresets.includes(opt.value)
          const optionLabel =
            isCustom && customValue
              ? `$${initialStart} – $${initialEnd}`
              : opt.label

          return (
            <button
              key={opt.value}
              type='button'
              className={cn(
                'group flex w-full max-w-full min-w-0 cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-1.5 text-left text-12 font-normal transition-colors hover:bg-gray-2',
                isSelected
                  ? 'bg-primary-3/40 text-primary-9'
                  : 'text-text-primary',
              )}
              onClick={() => {
                if (isCustom) {
                  setShowCustom(true)
                  return
                }
                togglePreset(opt.value)
              }}
            >
              {isCustom ? (
                <span
                  className={cn(
                    'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border',
                    isSelected
                      ? 'border-primary-9 bg-primary-9'
                      : 'border-border-default bg-surface',
                  )}
                >
                  {isSelected && (
                    <span className='h-1.5 w-1.5 rounded-full bg-white' />
                  )}
                </span>
              ) : (
                <input
                  checked={isSelected}
                  className='accent-primary-9'
                  readOnly
                  type='checkbox'
                />
              )}
              <span className='block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap group-hover:whitespace-normal group-hover:break-words'>
                {optionLabel}
              </span>
              {isCustom && (
                <ChevronRight className='h-3.5 w-3.5 shrink-0 opacity-50' />
              )}
            </button>
          )
        })}
      </div>

      <div className='flex items-center border-t border-border-default px-2.5 py-2'>
        <button
          className={cn(
            'cursor-pointer text-12 font-normal whitespace-nowrap transition-colors',
            selectedValues.length > 0
              ? 'text-text-secondary hover:text-text-primary hover:underline'
              : 'cursor-default text-text-muted',
          )}
          disabled={selectedValues.length === 0}
          type='button'
          onClick={onClear}
        >
          Clear selection
        </button>
      </div>
    </div>
  )
}
