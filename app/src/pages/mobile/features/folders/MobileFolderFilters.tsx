import { useEffect, useMemo, useState } from 'react'
import type { RepositoryItemFilterField } from '@/api/v6/folder/folder'
import { folderApi } from '@/pages/folders/api/folderApi'
import {
  splitFilterValues,
  toggleFilterValue,
} from '@/pages/folders/utils/multiFilterValues'
import cn from '@/utils/cn'
import { Icon } from '../../components/primitives/Icon'

type FilterChip = {
  dataType: string
  id: string
  label: string
}

type MobileFolderFiltersProps = {
  activeFilters: Record<string, string>
  folderContextFilters?: Record<string, string>
  itemFilterFields: RepositoryItemFilterField[]
  repositoryId: string
  onChange: (filters: Record<string, string>) => void
}

const isDateType = (dataType?: string) =>
  String(dataType || '')
    .trim()
    .toLowerCase()
    .includes('date')

const isNumberType = (dataType?: string) => {
  const normalized = String(dataType || '')
    .trim()
    .toUpperCase()
  return (
    normalized.includes('NUMBER') ||
    normalized.includes('INT') ||
    normalized.includes('FLOAT') ||
    normalized.includes('DECIMAL') ||
    normalized.includes('CURRENCY') ||
    normalized.includes('AMOUNT')
  )
}

export function MobileFolderFilters({
  activeFilters,
  folderContextFilters = {},
  itemFilterFields,
  repositoryId,
  onChange,
}: MobileFolderFiltersProps) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [options, setOptions] = useState<
    Array<{ count?: number; value: string }>
  >([])
  const [loading, setLoading] = useState(false)

  const chips = useMemo<FilterChip[]>(() => {
    const mapped = itemFilterFields
      .map((field) => {
        const id = String(field.sqlColumnName || field.name || '').trim()
        if (!id || isDateType(field.dataType) || isNumberType(field.dataType)) {
          return null
        }
        return {
          dataType: String(field.dataType || ''),
          id,
          label: String(field.name || field.sqlColumnName || id).trim() || id,
        }
      })
      .filter((field): field is FilterChip => Boolean(field))

    const dropdowns = mapped.filter((field) =>
      /SELECT|DROPDOWN|CHOICE|OPTIONS|LOOKUP|ENUM/i.test(field.dataType),
    )
    const others = mapped.filter((field) => !dropdowns.includes(field))
    return [...dropdowns, ...others]
  }, [itemFilterFields])

  const openChip = chips.find((chip) => chip.id === openId) || null

  useEffect(() => {
    if (!openChip || !repositoryId) {
      setOptions([])
      return
    }

    let cancelled = false
    setLoading(true)
    const scope: Record<string, string | string[]> = {}
    Object.entries({ ...folderContextFilters, ...activeFilters }).forEach(
      ([key, raw]) => {
        if (key === openChip.id) return
        const parts = splitFilterValues(raw)
        if (!parts.length) return
        scope[key] = parts.length === 1 ? parts[0] : parts
      },
    )

    void folderApi
      .getItemFacets(repositoryId, openChip.id, {
        limit: 100,
        scopeFilters: scope,
      })
      .then((facets) => {
        if (cancelled) return
        setOptions(
          facets
            .map((facet) => ({
              count: facet.count,
              value: String(facet.value || '').trim(),
            }))
            .filter((facet) => facet.value),
        )
      })
      .catch(() => {
        if (!cancelled) setOptions([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeFilters, folderContextFilters, openChip, repositoryId])

  if (!chips.length) return null

  const hasActive = chips.some((chip) =>
    Boolean(String(activeFilters[chip.id] || '').trim()),
  )

  const applyValue = (id: string, value: string) => {
    const nextValue = toggleFilterValue(activeFilters[id], value)
    const next = { ...activeFilters }
    if (nextValue) next[id] = nextValue
    else delete next[id]
    onChange(next)
  }

  return (
    <div className='mt-2.5'>
      <div className='no-scrollbar flex gap-2 overflow-x-auto'>
        {chips.map((chip) => {
          const selected = splitFilterValues(activeFilters[chip.id])
          const open = openId === chip.id
          return (
            <button
              key={chip.id}
              type='button'
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-11 font-medium transition-all active:scale-95',
                open || selected.length
                  ? 'border-[var(--blue-8)] bg-[var(--blue-4)] text-[var(--blue-12)]'
                  : 'border-border-default text-text-secondary',
              )}
              onClick={() =>
                setOpenId((current) => (current === chip.id ? null : chip.id))
              }
            >
              <span className='max-w-[140px] truncate'>
                {selected.length
                  ? `${chip.label} · ${selected.length}`
                  : chip.label}
              </span>
              <Icon className='size-2.5 text-text-muted' name='ChevronDown' />
            </button>
          )
        })}
        {hasActive ? (
          <button
            className='shrink-0 px-1 text-11 font-semibold text-accent-primary'
            type='button'
            onClick={() => {
              const next = { ...activeFilters }
              chips.forEach((chip) => {
                delete next[chip.id]
              })
              onChange(next)
              setOpenId(null)
            }}
          >
            Reset
          </button>
        ) : null}
      </div>

      {openChip ? (
        <div className='mt-2 max-h-44 overflow-y-auto rounded-xl border border-border-default bg-surface-primary p-1'>
          {loading ? (
            <p className='px-2 py-3 text-11 text-text-muted'>
              Loading options…
            </p>
          ) : options.length === 0 ? (
            <p className='px-2 py-3 text-11 text-text-muted'>
              No options for this filter
            </p>
          ) : (
            options.map((option) => {
              const selected = splitFilterValues(
                activeFilters[openChip.id],
              ).includes(option.value)
              return (
                <button
                  key={option.value}
                  type='button'
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-12',
                    selected
                      ? 'bg-[var(--blue-3)] font-semibold text-[var(--blue-12)]'
                      : 'text-text-primary',
                  )}
                  onClick={() => applyValue(openChip.id, option.value)}
                >
                  <span
                    className={cn(
                      'flex size-4 shrink-0 items-center justify-center rounded border',
                      selected
                        ? 'border-[var(--blue-8)] bg-[var(--blue-8)] text-white'
                        : 'border-border-default',
                    )}
                  >
                    {selected ? (
                      <Icon className='size-2.5' name='Check' />
                    ) : null}
                  </span>
                  <span className='min-w-0 flex-1 truncate'>
                    {option.value}
                  </span>
                  {option.count != null ? (
                    <span className='text-11 text-text-muted'>
                      {option.count}
                    </span>
                  ) : null}
                </button>
              )
            })
          )}
        </div>
      ) : null}
    </div>
  )
}
