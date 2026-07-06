import { useEffect } from 'react'
import Icon from '@/components/base/icon/Icon'
import Button from '@/components/base/button/Button'
import showToast from '@/components/base/toast/showToast'
import InputSelect from '@/components/base/inputs/InputSelect'
import { compareHeaderSimilarity } from '@/pages/requests/components/request/components/newrequest/poFlow/utils/headerSimilarity'
import { SYSTEM_TEMPLATE_COLUMNS } from '@/pages/requests/components/request/components/newrequest/poFlow/utils/templateSchema'
import { AnimateFadeIn } from '@/components/common/animations'

interface ColumnMappingProps {
  uploadedColumns: string[]
  previewRows: any[]
  mapping: Record<string, string>
  onChangeMapping: (mapping: Record<string, string>) => void
  showActionsRow?: boolean
  onConfirm?: () => void
  onCancel?: () => void
  isConfirmLoading?: boolean
}

export default function ColumnMapping({
  uploadedColumns,
  previewRows,
  mapping,
  onChangeMapping,
  showActionsRow = false,
  onConfirm,
  onCancel,
  isConfirmLoading = false,
}: ColumnMappingProps) {
  // Automatically run auto-map on mount if mapping is empty
  useEffect(() => {
    if (Object.keys(mapping).length === 0 && uploadedColumns.length > 0) {
      runAutoMap()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const runAutoMap = () => {
    const nextMapping: Record<string, string> = {}
    SYSTEM_TEMPLATE_COLUMNS.forEach((col) => {
      const match = uploadedColumns.find((u) =>
        compareHeaderSimilarity(u, col.key),
      )
      if (match) {
        nextMapping[col.key] = match
      }
    })
    onChangeMapping(nextMapping)
  }

  const handleReset = () => {
    runAutoMap()
    showToast({
      message: 'Reset to initial mapping suggestions.',
      variant: 'default',
    })
  }

  const handleSelectChange = (systemKey: string, value: string | null) => {
    onChangeMapping({
      ...mapping,
      [systemKey]: value ?? '',
    })
  }

  const requiredColumns = SYSTEM_TEMPLATE_COLUMNS.filter((c) => c.required)
  const requiredTotalCount = requiredColumns.length
  const requiredMappedCount = requiredColumns.filter(
    (c) => !!mapping[c.key] && mapping[c.key] !== 'Skip to Import',
  ).length

  const isConfirmDisabled = SYSTEM_TEMPLATE_COLUMNS.some(
    (col) => col.required && !mapping[col.key],
  )

  return (
    <AnimateFadeIn className='animate-in fade-in slide-in-from-top-2 mt-4 space-y-4 rounded-xl border border-border-default bg-surface-primary p-5 shadow-sm duration-300'>
      <div className='flex items-center justify-between border-b border-border-default pb-3'>
        <div>
          <h4 className='text-[14px] font-bold text-gray-12'>
            Confirm Column Mapping
          </h4>
          <p className='mt-0.5 text-[11px] text-gray-8'>
            Align uploaded columns with master system fields.
          </p>
        </div>
        <button
          className='flex items-center gap-1 text-[11px] font-bold text-primary-9 hover:underline'
          type='button'
          onClick={handleReset}
        >
          <Icon className='size-3.5' name='tabler:rotate' />
          <span>Reset</span>
        </button>
      </div>

      {/* Three-column Mapping Table */}
      <div className='flex flex-col gap-2'>
        {/* Table Header */}
        <div className='grid grid-cols-[1fr_1.2fr_1fr] border-b border-border-default pb-2 text-[10px] font-extrabold tracking-wider text-gray-8 uppercase'>
          <div>System Field</div>
          <div>Your Field</div>
          <div>Preview</div>
        </div>

        {/* Scrollable Mapping Rows Container */}
        <div className='max-h-[300px] divide-y divide-border-default/60 overflow-y-auto pr-1 custom-scrollbar'>
          {[...SYSTEM_TEMPLATE_COLUMNS]
            .sort((a, b) => {
              if (a.required === b.required) return 0
              return a.required ? -1 : 1
            })
            .map((col) => {
              const selectedVal = mapping[col.key] || ''
              const isMapped = !!selectedVal
              const previewVal =
                selectedVal && selectedVal !== 'Skip to Import'
                  ? String(previewRows[0]?.[selectedVal] ?? '')
                  : ''

              return (
                <div
                  className='grid grid-cols-[1fr_1.2fr_1fr] items-center gap-4 py-2.5 first:pt-1'
                  key={col.key}
                >
                  {/* Column 1: System Field */}
                  <div className='flex items-center gap-1.5 min-w-0'>
                    <span className='truncate text-[13px] font-semibold text-gray-12'>
                      {col.key}
                    </span>
                    {col.required && (
                      <Icon
                        className='size-2 shrink-0 text-red-11 animate-pulse'
                        name='tabler:asterisk'
                        title='Required Field'
                      />
                    )}
                  </div>

                  {/* Column 2: Your Field (Dropdown Selector) */}
                  <div>
                    <InputSelect
                      className='w-full'
                      clearable
                      searchable
                      options={[
                        { id: 'Skip to Import', name: 'Skip to Import' },
                        ...uploadedColumns.map((c) => ({ id: c, name: c })),
                      ]}
                      placeholder='Select column...'
                      styles={{
                        input: {
                          backgroundColor: isMapped
                            ? 'var(--primary-2)'
                            : 'var(--surface-primary)',
                          border: isMapped
                            ? '1px solid var(--primary-9)'
                            : '1px solid var(--gray-4)',
                          color: isMapped
                            ? 'var(--primary-12)'
                            : 'var(--gray-12)',
                          fontSize: '12px',
                          fontWeight: 500,
                          height: '32px',
                          minHeight: '32px',
                          borderRadius: '0.5rem',
                        },
                      }}
                      value={
                        selectedVal
                          ? { id: selectedVal, name: selectedVal }
                          : null
                      }
                      onChange={(v) =>
                        handleSelectChange(col.key, v ? String(v.id) : null)
                      }
                    />
                  </div>

                  {/* Column 3: Preview Value */}
                  <div
                    className='truncate text-[12px] font-medium text-gray-8'
                    title={previewVal}
                  >
                    {selectedVal === 'Skip to Import' ? (
                      <span className='text-gray-5 italic'>Skipped</span>
                    ) : previewVal ? (
                      <span className='font-semibold text-gray-12'>
                        "{previewVal}"
                      </span>
                    ) : (
                      <span className='text-gray-5 italic'>No data</span>
                    )}
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* Summary / Actions Footer */}
      {showActionsRow ? (
        <div className='mt-2 flex items-center justify-between border-t border-border-default pt-4'>
          <span className='text-[11px] font-semibold text-gray-8'>
            {requiredMappedCount} of {requiredTotalCount} required fields mapped
          </span>
          <div className='flex gap-2.5'>
            <Button size='xs' variant='outline' onClick={onCancel}>
              Cancel
            </Button>
            <Button
              disabled={isConfirmDisabled}
              loading={isConfirmLoading}
              size='xs'
              onClick={onConfirm}
            >
              Confirm & Ingest
            </Button>
          </div>
        </div>
      ) : (
        <div className='flex items-center justify-between border-t border-border-default pt-4 text-[11px] font-semibold text-gray-8'>
          <span>
            {requiredMappedCount} of {requiredTotalCount} required fields mapped
          </span>
          {requiredMappedCount === requiredTotalCount ? (
            <div className='flex items-center gap-1 text-green-11 font-semibold'>
              <Icon className='size-3.5' name='tabler:circle-check' />
              <span>Ready to continue</span>
            </div>
          ) : (
            <div className='flex items-center gap-1 text-orange-11 font-semibold'>
              <Icon className='size-3.5' name='tabler:alert-circle' />
              <span>Mapping required</span>
            </div>
          )}
        </div>
      )}
    </AnimateFadeIn>
  )
}
