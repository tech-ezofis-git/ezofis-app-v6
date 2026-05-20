import { Select } from '@mantine/core'
import { useEffect } from 'react'
import Icon from '@/components/base/icon/Icon'
import { AnimateFadeIn } from '@/components/common/animations'
import cn from '@/utils/cn'
import { compareHeaderSimilarity } from '../utils/headerSimilarity'

type Props = {
  mapping: Record<string, string>
  systemColumns: SystemCol[]
  uploadedColumns: string[]
  onBack?: () => void
  onNext?: () => void
  setMapping: (m: Record<string, string>) => void
}

type SystemCol = { key: string; required: boolean }

export default function Step2ColumnMapping({
  mapping,
  systemColumns,
  uploadedColumns,
  setMapping,
}: Props) {
  // 1. Automatically run auto-map on mount
  useEffect(() => {
    const next: Record<string, string> = { ...mapping }
    let hasChanges = false

    for (const col of systemColumns) {
      // Only auto-fill if not already mapped
      if (!next[col.key]) {
        const match = uploadedColumns.find((u) =>
          compareHeaderSimilarity(u, col.key),
        ) // Use the similarity function
        if (match) {
          next[col.key] = match
          hasChanges = true
        }
      }
    }

    if (hasChanges) {
      setMapping(next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Runs once on mount

  // Sort: Required fields first
  const sortedColumns = [...systemColumns].sort((a, b) => {
    if (a.required === b.required) return 0
    return a.required ? -1 : 1
  })

  const requiredTotal = systemColumns.filter((c) => c.required).length
  const requiredMapped = systemColumns.filter(
    (c) => c.required && !!mapping[c.key],
  ).length
  // const isReady = requiredMapped === requiredTotal;

  const options = uploadedColumns.map((c) => ({ label: c, value: c }))

  return (
    <AnimateFadeIn className='flex flex-col gap-4'>
      <div className='flex items-start justify-between gap-4'>
        <div className='min-w-0'>
          <h2 className='text-xl font-bold text-gray-13'>Column Mapping</h2>
          <p className='mt-0.5 text-xs font-medium text-gray-11'>
            Align your file columns with Master Fields to ensure accurate data
            processing.
          </p>
        </div>

        <div className='flex items-center gap-2 rounded-full border border-gray-3 bg-surface-secondary px-3 py-1.5 shadow-sm'>
          <span className='text-xs font-bold text-gray-11'>
            {requiredMapped} / {requiredTotal} Required Mapped
          </span>
        </div>
      </div>

      <div className='grid grid-cols-[1fr_40px_1fr] px-4 text-[10px] font-bold tracking-wider text-gray-10 uppercase'>
        <div>Master Field</div>
        <div />
        <div>Source Field</div>
      </div>

      <div className='space-y-2'>
        {sortedColumns.map((col) => {
          const selected = mapping[col.key] || ''
          const isMapped = !!selected
          const isRequiredMissing = col.required && !isMapped

          return (
            <div
              key={col.key}
              className={cn(
                'grid grid-cols-[1fr_40px_1fr] items-center rounded-xl border px-4 py-2.5 transition-all duration-300',
                isMapped
                  ? 'border-[var(--primary-3)] bg-surface-primary shadow-sm'
                  : isRequiredMissing
                    ? 'border-error-subtle bg-error-subtle/20'
                    : 'border-gray-3 bg-surface-secondary/30',
              )}
            >
              {/* Field Name */}
              <div className='flex min-w-0 items-center gap-3'>
                <div
                  className={cn(
                    'size-2 shrink-0 rounded-full transition-colors duration-300',
                    isMapped ? 'bg-primary-9' : 'bg-gray-5',
                  )}
                />
                <div className='min-w-0'>
                  <div className='flex min-w-0 items-center gap-2'>
                    <span className='truncate text-sm font-semibold text-gray-13'>
                      {col.key}
                    </span>
                    {col.required && (
                      <span className='bg-error-subtle inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider text-error-main uppercase'>
                        Required
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Connector Icon */}
              <div className='flex justify-center text-gray-5'>
                <Icon className='size-4' name='tabler:arrow-right' />
              </div>

              {/* Selection Dropdown */}
              <div className='flex items-center'>
                <Select
                  data={options}
                  nothingFoundMessage='No columns found'
                  placeholder='Select a column…'
                  value={selected || null}
                  variant='unstyled'
                  clearable
                  searchable
                  className={cn(
                    'w-full rounded-lg border px-3 transition-all duration-300',
                    isMapped
                      ? 'border-primary-9 bg-surface-primary ring-2 ring-primary-9/5'
                      : 'border-gray-4 bg-surface-primary hover:border-gray-5',
                  )}
                  styles={{
                    dropdown: {
                      border: '1px solid var(--gray-3)',
                      borderRadius: '12px',
                      boxShadow: 'var(--shadow-md)',
                    },
                    input: {
                      fontSize: '13px',
                      fontWeight: 500,
                      height: '40px',
                    },
                  }}
                  onChange={(v: any) =>
                    setMapping({ ...mapping, [col.key]: v ?? '' })
                  }
                />
              </div>
            </div>
          )
        })}
      </div>
    </AnimateFadeIn>
  )
}
