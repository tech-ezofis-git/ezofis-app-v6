import { useEffect, useMemo, useState } from 'react'
import workflowsApiV6 from '@/api/v6/workflows'
import cn from '@/utils/cn'
import { AppButton } from '../../components/primitives/AppButton'
import { Icon } from '../../components/primitives/Icon'

type FilterField = {
  dataType: string
  id: string
  label: string
}

type QuickFilter = {
  id: string
  label: string
}

type MobileRequestFiltersProps = {
  activeQuickFilters: string[]
  fieldFilters: Record<string, string[]>
  fields: FilterField[]
  quickFilters?: QuickFilter[]
  workflowId?: string | null
  onApply: (filters: Record<string, string[]>, quickFilters: string[]) => void
}

type FieldKind = 'choice' | 'date' | 'number'

type RangeDraft = { from: string; to: string }

const fieldKind = (dataType: string): FieldKind => {
  const normalized = dataType.toUpperCase()
  if (normalized.includes('DATE') || normalized.includes('TIME')) return 'date'
  if (
    normalized.includes('NUMBER') ||
    normalized.includes('INT') ||
    normalized.includes('FLOAT') ||
    normalized.includes('DECIMAL') ||
    normalized.includes('CURRENCY') ||
    normalized.includes('AMOUNT')
  ) {
    return 'number'
  }
  return 'choice'
}

const readRange = (values: string[] | undefined, kind: FieldKind): RangeDraft => {
  const raw = values?.[0] || ''
  if (kind === 'date' && raw.startsWith('custom:')) {
    const [from = '', to = ''] = raw.replace('custom:', '').split('_')
    return { from, to }
  }
  if (kind === 'number' && raw.startsWith('custom:')) {
    const [from = '', to = ''] = raw.replace('custom:', '').split('-')
    return { from, to }
  }
  return { from: raw, to: '' }
}

const writeRange = (range: RangeDraft, kind: FieldKind) => {
  const from = range.from.trim()
  const to = range.to.trim()
  if (!from && !to) return []
  if (from && to) {
    return kind === 'date' ? [`custom:${from}_${to}`] : [`custom:${from}-${to}`]
  }
  return [from || to]
}

export function MobileRequestFilters({
  activeQuickFilters,
  fieldFilters,
  fields,
  quickFilters = [],
  workflowId,
  onApply,
}: MobileRequestFiltersProps) {
  const [open, setOpen] = useState(false)
  const [choices, setChoices] = useState<Record<string, string[]>>({})
  const [ranges, setRanges] = useState<Record<string, RangeDraft>>({})
  const [quick, setQuick] = useState<string[]>([])
  const [optionsByField, setOptionsByField] = useState<Record<string, string[]>>({})
  const [loadingOptions, setLoadingOptions] = useState(false)

  const choiceFields = useMemo(
    () => fields.filter((field) => fieldKind(field.dataType) === 'choice'),
    [fields],
  )

  const appliedCount = useMemo(() => {
    const fieldCount = Object.values(fieldFilters).filter((values) => values.length).length
    return fieldCount + activeQuickFilters.length
  }, [activeQuickFilters.length, fieldFilters])

  useEffect(() => {
    if (!open) return
    const nextChoices: Record<string, string[]> = {}
    const nextRanges: Record<string, RangeDraft> = {}
    fields.forEach((field) => {
      const kind = fieldKind(field.dataType)
      if (kind === 'choice') {
        nextChoices[field.id] = [...(fieldFilters[field.id] || [])]
      } else {
        nextRanges[field.id] = readRange(fieldFilters[field.id], kind)
      }
    })
    setChoices(nextChoices)
    setRanges(nextRanges)
    setQuick([...activeQuickFilters])
  }, [activeQuickFilters, fieldFilters, fields, open])

  useEffect(() => {
    if (!open || !workflowId || !choiceFields.length) return
    let cancelled = false
    setLoadingOptions(true)
    void Promise.all(
      choiceFields.map(async (field) => {
        try {
          const res = await workflowsApiV6.getControlValues(
            String(workflowId),
            field.label,
          )
          const values = Array.isArray(res.data?.values) ? res.data.values : []
          return [field.id, values.map((value) => String(value)).filter(Boolean)] as const
        } catch {
          return [field.id, []] as const
        }
      }),
    )
      .then((entries) => {
        if (cancelled) return
        setOptionsByField(Object.fromEntries(entries))
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false)
      })
    return () => {
      cancelled = true
    }
  }, [choiceFields, open, workflowId])

  const draftCount = useMemo(() => {
    const choiceCount = Object.values(choices).filter((values) => values.length).length
    const rangeCount = Object.values(ranges).filter(
      (range) => range.from.trim() || range.to.trim(),
    ).length
    return choiceCount + rangeCount + quick.length
  }, [choices, quick.length, ranges])

  const toggleChoice = (fieldId: string, value: string) => {
    setChoices((current) => {
      const selected = current[fieldId] || []
      const next = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value]
      return { ...current, [fieldId]: next }
    })
  }

  const clearDraft = () => {
    setChoices({})
    setRanges({})
    setQuick([])
  }

  const apply = () => {
    const next: Record<string, string[]> = {}
    fields.forEach((field) => {
      const kind = fieldKind(field.dataType)
      const values =
        kind === 'choice'
          ? choices[field.id] || []
          : writeRange(ranges[field.id] || { from: '', to: '' }, kind)
      if (values.length) next[field.id] = values
    })
    onApply(next, quick)
    setOpen(false)
  }

  if (!fields.length && !quickFilters.length) return null

  return (
    <div className='shrink-0 px-3 pt-2.5'>
      <button
        type='button'
        className={cn(
          'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-all active:scale-95',
          open || appliedCount
            ? 'border-[var(--gray-12)] bg-[var(--gray-12)] text-white'
            : 'border-border-default bg-surface-primary text-text-primary',
        )}
        onClick={() => setOpen((current) => !current)}
      >
        <Icon className='size-3.5' name='SlidersHorizontal' />
        Filters
        {appliedCount ? <span>({appliedCount})</span> : null}
      </button>

      {open ? (
        <div className='animate-in fade-in slide-in-from-top-2 mt-2 rounded-2xl border border-border-default bg-surface-primary p-4 shadow-md duration-300'>
          <div className='relative flex items-center justify-center'>
            <button
              className='absolute left-0 text-[13px] font-semibold text-error-main active:opacity-70'
              type='button'
              onClick={clearDraft}
            >
              Reset
            </button>
            <p className='text-[15px] font-semibold text-text-primary'>Filters</p>
          </div>

          <div className='mt-4 flex max-h-[50vh] flex-col gap-4 overflow-y-auto'>
            {quickFilters.length ? (
              <section>
                <p className='mb-2 text-[13px] font-medium text-text-secondary'>Status</p>
                <div className='flex flex-wrap gap-2'>
                  {quickFilters.map((filter) => {
                    const selected = quick.includes(filter.id)
                    return (
                      <button
                        key={filter.id}
                        type='button'
                        className={cn(
                          'inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[12px] font-medium active:scale-95',
                          selected
                            ? 'border-[var(--gray-12)] bg-[var(--gray-12)] text-white'
                            : 'border-border-default bg-surface-primary text-text-primary',
                        )}
                        onClick={() =>
                          setQuick((current) =>
                            current.includes(filter.id)
                              ? current.filter((id) => id !== filter.id)
                              : [...current, filter.id],
                          )
                        }
                      >
                        {filter.label}
                        {selected ? <Icon className='size-3' name='Check' /> : null}
                      </button>
                    )
                  })}
                </div>
              </section>
            ) : null}

            {fields.map((field) => {
              const kind = fieldKind(field.dataType)
              if (kind === 'date' || kind === 'number') {
                const range = ranges[field.id] || { from: '', to: '' }
                return (
                  <section key={field.id}>
                    <p className='mb-2 text-[13px] font-medium text-text-secondary'>
                      {field.label}
                    </p>
                    <div className='grid grid-cols-2 gap-2'>
                      <label className='flex min-h-11 items-center gap-2 rounded-xl border border-border-default bg-surface-secondary px-3'>
                        <Icon
                          className='size-3.5 text-text-muted'
                          name={kind === 'date' ? 'Calendar' : 'DollarSign'}
                        />
                        <input
                          className='min-w-0 flex-1 bg-transparent text-[13px] text-text-primary outline-none'
                          type={kind === 'date' ? 'date' : 'number'}
                          value={range.from}
                          placeholder={kind === 'number' ? 'Min' : undefined}
                          onChange={(event) =>
                            setRanges((current) => ({
                              ...current,
                              [field.id]: { ...range, from: event.target.value },
                            }))
                          }
                        />
                      </label>
                      <label className='flex min-h-11 items-center gap-2 rounded-xl border border-border-default bg-surface-secondary px-3'>
                        <Icon
                          className='size-3.5 text-text-muted'
                          name={kind === 'date' ? 'Calendar' : 'DollarSign'}
                        />
                        <input
                          className='min-w-0 flex-1 bg-transparent text-[13px] text-text-primary outline-none'
                          type={kind === 'date' ? 'date' : 'number'}
                          value={range.to}
                          placeholder={kind === 'number' ? 'Max' : undefined}
                          onChange={(event) =>
                            setRanges((current) => ({
                              ...current,
                              [field.id]: { ...range, to: event.target.value },
                            }))
                          }
                        />
                      </label>
                    </div>
                  </section>
                )
              }

              const options = optionsByField[field.id] || []
              const selected = choices[field.id] || []
              return (
                <section key={field.id}>
                  <p className='mb-2 text-[13px] font-medium text-text-secondary'>
                    {field.label}
                  </p>
                  {loadingOptions ? (
                    <p className='text-[12px] text-text-muted'>Loading options…</p>
                  ) : options.length === 0 ? (
                    <p className='text-[12px] text-text-muted'>No options for this filter</p>
                  ) : (
                    <div className='flex flex-wrap gap-2'>
                      {options.map((option) => {
                        const active = selected.includes(option)
                        return (
                          <button
                            key={option}
                            type='button'
                            className={cn(
                              'inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[12px] font-medium active:scale-95',
                              active
                                ? 'border-[var(--gray-12)] bg-[var(--gray-12)] text-white'
                                : 'border-border-default bg-surface-primary text-text-primary',
                            )}
                            onClick={() => toggleChoice(field.id, option)}
                          >
                            {option}
                            {active ? <Icon className='size-3' name='Check' /> : null}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </section>
              )
            })}
          </div>

          <AppButton
            className='mt-4 border-border-default bg-surface-primary text-text-primary'
            variant='outline'
            fullWidth
            onClick={clearDraft}
          >
            Clear all
          </AppButton>
          <AppButton className='mt-2 bg-[var(--gray-12)] text-white' fullWidth onClick={apply}>
            Apply{draftCount ? ` (${draftCount})` : ''}
          </AppButton>
        </div>
      ) : null}
    </div>
  )
}
