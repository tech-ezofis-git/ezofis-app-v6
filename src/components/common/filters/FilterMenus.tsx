import { ChevronRight, Loader2, Search } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import InputDate from '@/components/base/inputs/InputDate'
import InputNumber from '@/components/base/inputs/InputNumber'
import type { FilterOption } from '@/utils/filterUtils'
import cn from '@/utils/cn'

interface FilterMenuProps {
  options: FilterOption[]
  selectedValues: string[]
  label?: string
  /** When true, keeps Apply in loading until the parent fetch finishes */
  isLoading?: boolean
  /** Dynamic lists only — hide for fixed date/amount preset lists */
  showCount?: boolean
  showSearch?: boolean
  onChange: (values: string[]) => void
  onClear: () => void
}

/** Shared option-row typography to match filter chips (text-12 / medium). */
const FILTER_OPTION_ROW =
  'group flex w-full max-w-full min-w-0 cursor-pointer items-start gap-2.5 rounded px-2.5 py-1.5 text-left text-12 font-medium text-text-primary transition-colors hover:bg-gray-2'
const FILTER_OPTION_ROW_SELECTED = 'bg-primary-3/30 text-primary-9'
const FILTER_OPTION_LABEL =
  'block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-12 font-medium group-hover:whitespace-normal group-hover:break-words'
const FILTER_MENU_ACTION =
  'cursor-pointer text-12 font-medium whitespace-nowrap transition-colors'
const FILTER_MENU_ACTION_ENABLED =
  'text-text-secondary hover:text-text-primary hover:underline'
const FILTER_MENU_ACTION_DISABLED = 'cursor-default text-text-muted'

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
  isLoading = false,
  showCount = true,
  showSearch = true,
  onChange,
  onClear,
}: FilterMenuProps) {
  const [search, setSearch] = useState('')
  // Draft selection — commit only on Apply to avoid API calls per checkbox
  const [draftValues, setDraftValues] = useState(selectedValues)
  const [isApplying, setIsApplying] = useState(false)
  const sawParentLoading = useRef(false)

  useEffect(() => {
    setDraftValues(selectedValues)
  }, [selectedValues])

  useEffect(() => {
    if (!isApplying) {
      sawParentLoading.current = false
      return
    }
    if (isLoading) {
      sawParentLoading.current = true
      return
    }
    if (sawParentLoading.current) {
      setIsApplying(false)
      sawParentLoading.current = false
      return
    }
    const timer = window.setTimeout(() => setIsApplying(false), 400)
    return () => window.clearTimeout(timer)
  }, [isApplying, isLoading])

  const isAllOption = (opt: FilterOption) =>
    /^all(\s|$)/i.test(opt.label) ||
    opt.value === 'all' ||
    opt.value === '__all__'

  const itemOptions = options.filter((opt) => !isAllOption(opt))
  const existingAllOption = options.find(isAllOption)
  const allOption: FilterOption = existingAllOption || {
    label: 'All',
    value: '__all__',
  }
  // Only show All when there are real options to select
  const menuOptions =
    itemOptions.length === 0
      ? itemOptions
      : existingAllOption
        ? options
        : [allOption, ...itemOptions]
  const itemValues = itemOptions.map((opt) => opt.value)

  const isAllSelected =
    draftValues.includes(allOption.value) ||
    (itemValues.length > 0 &&
      itemValues.every((value) => draftValues.includes(value)))

  const filteredOptions = menuOptions.filter((opt) =>
    !showSearch || !search
      ? true
      : opt.label.toLowerCase().includes(search.toLowerCase()),
  )

  const isOptionSelected = (opt: FilterOption) => {
    if (isAllOption(opt)) return isAllSelected
    return draftValues.includes(opt.value) || isAllSelected
  }

  const toggleValue = (opt: FilterOption) => {
    if (isApplying) return
    if (isAllOption(opt)) {
      if (isAllSelected) {
        setDraftValues([])
      } else {
        setDraftValues([allOption.value, ...itemValues])
      }
      return
    }

    if (isAllSelected) {
      setDraftValues(itemValues.filter((value) => value !== opt.value))
      return
    }

    if (draftValues.includes(opt.value)) {
      setDraftValues(
        draftValues.filter(
          (value) => value !== opt.value && value !== allOption.value,
        ),
      )
      return
    }

    const next = [
      ...draftValues.filter((value) => value !== allOption.value),
      opt.value,
    ]
    if (itemValues.length > 0 && itemValues.every((value) => next.includes(value))) {
      setDraftValues([allOption.value, ...itemValues])
      return
    }
    setDraftValues(next)
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
            disabled={isApplying}
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
            const isSelected = isOptionSelected(opt)
            return (
              <label
                key={opt.value}
                className={cn(
                  FILTER_OPTION_ROW,
                  'gap-2',
                  isSelected && FILTER_OPTION_ROW_SELECTED,
                  isApplying && 'pointer-events-none opacity-60',
                )}
              >
                <input
                  checked={isSelected}
                  className='accent-primary-9 mt-0.5 shrink-0'
                  disabled={isApplying}
                  type='checkbox'
                  onChange={() => toggleValue(opt)}
                />
                <span className={FILTER_OPTION_LABEL}>
                  {isAllOption(opt) ? 'All' : opt.label}
                </span>
              </label>
            )
          })
        )}
      </div>

      <div className='flex w-full flex-col gap-2 border-t border-border-default px-2.5 py-2'>
        <div
          className={cn(
            'flex w-full items-center gap-2',
            showCount ? 'justify-between' : 'justify-start',
          )}
        >
          <button
            className={cn(
              FILTER_MENU_ACTION,
              draftValues.length > 0 || selectedValues.length > 0
                ? FILTER_MENU_ACTION_ENABLED
                : FILTER_MENU_ACTION_DISABLED,
            )}
            disabled={
              isApplying ||
              (draftValues.length === 0 && selectedValues.length === 0)
            }
            type='button'
            onClick={() => {
              setDraftValues([])
              onClear()
            }}
          >
            Clear selection
          </button>
          {showCount ? (
            <span className='text-12 font-medium whitespace-nowrap text-text-muted'>
              {filteredOptions.length} of {menuOptions.length}
            </span>
          ) : null}
        </div>
        <button
          className='inline-flex w-full items-center justify-center gap-1.5 rounded bg-primary-9 py-1.5 text-12 font-medium text-white disabled:opacity-50'
          disabled={draftValues.length === 0 || isApplying}
          type='button'
          onClick={() => {
            setIsApplying(true)
            onChange(draftValues)
          }}
        >
          {isApplying ? (
            <>
              <Loader2 className='h-3.5 w-3.5 animate-spin' />
              Applying...
            </>
          ) : (
            'Apply'
          )}
        </button>
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
      <button
        aria-label='Back'
        className='inline-flex cursor-pointer items-center gap-1.5 self-start text-12 font-medium text-text-primary transition-colors hover:text-text-secondary'
        type='button'
        onClick={onCancel}
      >
        <ChevronRight className='h-3.5 w-3.5 shrink-0 rotate-180' />
        Custom Range
      </button>

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

      {hasValue && onClear && (
        <button
          className='cursor-pointer self-start text-12 font-medium text-text-secondary transition-colors hover:text-text-primary hover:underline'
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

      <div className='flex items-center gap-2'>
        <button
          className='flex-1 rounded border border-border-default bg-surface py-1.5 text-12 font-medium text-text-primary transition-colors hover:bg-gray-2'
          type='button'
          onClick={onCancel}
        >
          Cancel
        </button>
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
                FILTER_OPTION_ROW,
                isSelected && FILTER_OPTION_ROW_SELECTED,
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
              <span className={FILTER_OPTION_LABEL}>
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
            FILTER_MENU_ACTION,
            selectedValues.length > 0
              ? FILTER_MENU_ACTION_ENABLED
              : FILTER_MENU_ACTION_DISABLED,
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
  isLoading = false,
  onChange,
  onClear,
}: FilterMenuProps) {
  const customValue = selectedValues.find((v) => v.startsWith('custom:'))
  const [showCustom, setShowCustom] = useState(() => Boolean(customValue))
  const [draftValues, setDraftValues] = useState(selectedValues)
  const [isApplying, setIsApplying] = useState(false)
  const sawParentLoading = useRef(false)

  useEffect(() => {
    setDraftValues(selectedValues)
  }, [selectedValues])

  useEffect(() => {
    if (!isApplying) {
      sawParentLoading.current = false
      return
    }
    if (isLoading) {
      sawParentLoading.current = true
      return
    }
    if (sawParentLoading.current) {
      setIsApplying(false)
      sawParentLoading.current = false
      return
    }
    const timer = window.setTimeout(() => setIsApplying(false), 400)
    return () => window.clearTimeout(timer)
  }, [isApplying, isLoading])

  const initialStart = customValue
    ? customValue.replace('custom:', '').split('-')[0]
    : ''
  const initialEnd = customValue
    ? customValue.replace('custom:', '').split('-')[1]
    : ''
  const draftCustom = draftValues.find((v) => v.startsWith('custom:'))
  const selectedPresets = draftValues.filter((v) => !v.startsWith('custom:'))

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
    if (isApplying) return
    const withoutCustom = selectedPresets.filter((v) => v !== value)
    if (selectedPresets.includes(value)) {
      setDraftValues(withoutCustom)
      return
    }
    setDraftValues([...withoutCustom, value])
  }

  return (
    <div className='flex w-max max-w-64 flex-col overflow-hidden bg-surface'>
      <div className='ez-scrollbar flex max-h-[240px] w-full flex-col gap-0.5 overflow-y-auto p-2'>
        {options.map((opt) => {
          const isCustom = opt.value === 'custom'
          const isSelected = isCustom
            ? Boolean(draftCustom)
            : selectedPresets.includes(opt.value)
          const optionLabel =
            isCustom && draftCustom
              ? `$${draftCustom.replace('custom:', '').split('-')[0]} – $${draftCustom.replace('custom:', '').split('-')[1]}`
              : opt.label

          return (
            <button
              key={opt.value}
              type='button'
              disabled={isApplying}
              className={cn(
                FILTER_OPTION_ROW,
                isSelected && FILTER_OPTION_ROW_SELECTED,
                isApplying && 'pointer-events-none opacity-60',
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
              <span className={FILTER_OPTION_LABEL}>{optionLabel}</span>
              {isCustom && (
                <ChevronRight className='h-3.5 w-3.5 shrink-0 opacity-50' />
              )}
            </button>
          )
        })}
      </div>

      <div className='flex w-full flex-col gap-2 border-t border-border-default px-2.5 py-2'>
        <button
          className={cn(
            FILTER_MENU_ACTION,
            'self-start',
            draftValues.length > 0 || selectedValues.length > 0
              ? FILTER_MENU_ACTION_ENABLED
              : FILTER_MENU_ACTION_DISABLED,
          )}
          disabled={
            isApplying ||
            (draftValues.length === 0 && selectedValues.length === 0)
          }
          type='button'
          onClick={() => {
            setDraftValues([])
            onClear()
          }}
        >
          Clear selection
        </button>
        <button
          className='inline-flex w-full items-center justify-center gap-1.5 rounded bg-primary-9 py-1.5 text-12 font-medium text-white disabled:opacity-50'
          disabled={draftValues.length === 0 || isApplying}
          type='button'
          onClick={() => {
            setIsApplying(true)
            onChange(draftValues)
          }}
        >
          {isApplying ? (
            <>
              <Loader2 className='h-3.5 w-3.5 animate-spin' />
              Applying...
            </>
          ) : (
            'Apply'
          )}
        </button>
      </div>
    </div>
  )
}
